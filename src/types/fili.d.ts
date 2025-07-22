declare module "fili" {
  export class CalcCascades {
    bandpass(options: any): any;
  }

  export class IirFilter {
    constructor(coeffs: any);
    filtfilt(data: number[] | Float32Array): number[];
  }
}
