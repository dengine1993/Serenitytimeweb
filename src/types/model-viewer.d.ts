// Type declarations for @google/model-viewer web component

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      src?: string;
      alt?: string;
      'camera-controls'?: boolean;
      autoplay?: boolean;
      'ar-modes'?: string;
      'shadow-intensity'?: string;
      'touch-action'?: string;
      'interaction-prompt'?: string;
      exposure?: string | number;
      'camera-orbit'?: string;
      style?: React.CSSProperties;
      className?: string;
    }, HTMLElement>;
  }
}
