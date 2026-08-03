import { ensureWorkerHeapLimit } from './ensure-heap'

// Raise V8 heap before loading the heavy worker dependency graph.
ensureWorkerHeapLimit()

await import('./cli')
