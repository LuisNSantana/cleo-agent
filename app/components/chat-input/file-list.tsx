import { AnimatePresence, motion } from "motion/react"
import { FileItem } from "./file-items"

type FileListProps = {
  files: File[]
  onFileRemove: (file: File) => void
}

const TRANSITION = {
  type: "spring" as const,
  duration: 0.3,
  bounce: 0.2,
}

const CANVAS_TRANSITION = {
  type: "spring" as const,
  duration: 0.4,
  bounce: 0.3,
}

export function FileList({ files, onFileRemove }: FileListProps) {
  return (
    <AnimatePresence initial={false}>
      {files.length > 0 && (
        <motion.div
          key="files-list"
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          exit={{ height: 0 }}
          transition={TRANSITION}
          className="overflow-hidden"
        >
          <div className="flex flex-row overflow-x-auto pl-3">
            <AnimatePresence initial={false}>
              {files.map((file) => {
                const isCanvasDrawing = file.name === 'canvas-drawing.png'
                const transition = isCanvasDrawing ? CANVAS_TRANSITION : TRANSITION
                
                return (
                  <motion.div
                    key={file.name}
                    initial={{ width: 0, scale: 0.8, opacity: 0 }}
                    animate={{ width: 180, scale: 1, opacity: 1 }}
                    exit={{ width: 0, scale: 0.8, opacity: 0 }}
                    transition={transition}
                    className="relative shrink-0 overflow-hidden pt-2"
                  >
                    <FileItem
                      key={file.name}
                      file={file}
                      onRemove={onFileRemove}
                    />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
