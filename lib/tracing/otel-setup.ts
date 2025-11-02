import { trace, context, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let globalTracer: Tracer | null = null;
let isSetup = false;

export interface OtelConfig {
  serviceName?: string;
  serviceVersion?: string;
  endpoint?: string;
  enabled?: boolean;
  debug?: boolean;
}

/**
 * Setup OpenTelemetry tracing for Cleo agents.
 * Compatible with Jaeger, Zipkin, Honeycomb, and other OTLP-compatible backends.
 */
export function setupOtelTracing(config: OtelConfig = {}): Tracer {
  if (isSetup && globalTracer) {
    return globalTracer;
  }

  const {
    serviceName = 'cleo-agent',
    serviceVersion = process.env.npm_package_version || '1.0.0',
    endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    enabled = process.env.OTEL_TRACING_ENABLED !== 'false',
    debug = process.env.NODE_ENV === 'development',
  } = config;

  if (!enabled) {
    console.log('🔕 OpenTelemetry tracing disabled');
    // Return no-op tracer
    globalTracer = trace.getTracer(serviceName);
    isSetup = true;
    return globalTracer;
  }

  const resource = defaultResource().merge(
    resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    })
  );

  // Configure span processor
  const spanProcessors = [];
  if (endpoint) {
    const exporter = new OTLPTraceExporter({
      url: endpoint,
      headers: {
        ...(process.env.OTEL_EXPORTER_OTLP_HEADERS && 
          JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)),
      },
    });

    const processor = debug 
      ? new SimpleSpanProcessor(exporter) // Immediate export for debugging
      : new BatchSpanProcessor(exporter); // Batched for production
    
    spanProcessors.push(processor);
    console.log(`✅ OpenTelemetry tracing enabled → ${endpoint}`);
  } else {
    console.log('⚠️  OpenTelemetry: No endpoint configured, traces will not be exported');
  }

  const provider = new NodeTracerProvider({ 
    resource,
    spanProcessors,
  });

  provider.register();
  globalTracer = trace.getTracer(serviceName, serviceVersion);
  isSetup = true;

  return globalTracer;
}

/**
 * Get the global tracer instance. Will initialize if not already setup.
 */
export function getTracer(): Tracer {
  if (!globalTracer) {
    return setupOtelTracing();
  }
  return globalTracer;
}

/**
 * Helper to create a span and execute a function within its context
 */
export async function withSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const tracer = getTracer();
  
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      span.setAttributes(attributes);
    }

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Extract trace context from headers (for distributed tracing)
 */
export function extractTraceContext(headers: Record<string, string | string[] | undefined>) {
  // OpenTelemetry standard propagation headers
  const traceparent = headers['traceparent'];
  const tracestate = headers['tracestate'];
  
  if (typeof traceparent === 'string') {
    return { traceparent, tracestate };
  }
  
  return null;
}

export { context, trace, SpanStatusCode };
