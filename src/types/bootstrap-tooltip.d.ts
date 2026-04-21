declare module 'bootstrap/js/dist/tooltip' {
  export default class Tooltip {
    constructor(element: HTMLElement, options?: Record<string, unknown>);
    hide(): void;
    dispose(): void;
  }
}
