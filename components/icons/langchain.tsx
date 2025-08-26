export default function LangChain(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* LangChain icon - chain links with gradient */}
      <defs>
        <linearGradient id="langchain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#1E90FF", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#32CD32", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Chain link 1 */}
      <path
        d="M6 8.5C6 7.1 7.1 6 8.5 6H11.5C12.9 6 14 7.1 14 8.5V11.5C14 12.9 12.9 14 11.5 14H8.5C7.1 14 6 12.9 6 11.5V8.5Z"
        stroke="url(#langchain-gradient)"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Chain link 2 */}
      <path
        d="M10 12.5C10 11.1 11.1 10 12.5 10H15.5C16.9 10 18 11.1 18 12.5V15.5C18 16.9 16.9 18 15.5 18H12.5C11.1 18 10 16.9 10 15.5V12.5Z"
        stroke="url(#langchain-gradient)"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Connection dot */}
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill="url(#langchain-gradient)"
      />
      
      {/* Brain/AI element */}
      <path
        d="M12 4C12.5 4 13 3.5 13 3S12.5 2 12 2S11 2.5 11 3S11.5 4 12 4Z"
        fill="url(#langchain-gradient)"
      />
      <path
        d="M8 21C8.5 21 9 20.5 9 20S8.5 19 8 19S7 19.5 7 20S7.5 21 8 21Z"
        fill="url(#langchain-gradient)"
      />
      <path
        d="M16 21C16.5 21 17 20.5 17 20S16.5 19 16 19S15 19.5 15 20S15.5 21 16 21Z"
        fill="url(#langchain-gradient)"
      />
    </svg>
  )
}
