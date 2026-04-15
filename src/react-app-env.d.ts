/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_AUTH_API_URL?: string;
    REACT_APP_KURTTO_API_URL?: string;
  }
}
