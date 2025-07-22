import {
  serialization,
  loadLayersModel,
  LayersModel,
  Tensor,
  Rank,
} from "@tensorflow/tfjs";
import MovingAvgProcessor, {
  MovingAvgProcessorInteface,
} from "./moveAvgProcessor";
import TSM from "../tensorflow/TSM";
import AttentionMask from "../tensorflow/AttentionMask";
import { BATCHSIZE } from "../constant";
import TensorStore from "./tensorStore"; // 싱글턴 직접 import

const path = "model.json";

export interface PosprocessorInteface {
  compute(normalizedBatch: Tensor<Rank>, rawBatch: Tensor<Rank>): void;
}

class Posprocessor implements PosprocessorInteface {
  rppgAvgProcessor: MovingAvgProcessorInteface;
  respAvgProcessor: MovingAvgProcessor;
  model: LayersModel | null;

  constructor() {
    this.rppgAvgProcessor = new MovingAvgProcessor();
    this.respAvgProcessor = new MovingAvgProcessor();
    this.model = null;
  }

  reset = () => {
    this.rppgAvgProcessor.reset();
    this.respAvgProcessor.reset();
  };

  loadModel = async () => {
    if (this.model === null) {
      serialization.registerClass(TSM);
      serialization.registerClass(AttentionMask);
      this.model = await loadLayersModel(path);
      console.log(" % model loaded successfully");
    }
    return true;
  };

  compute = (normalizedBatch: Tensor<Rank>, rawBatch: Tensor<Rank>) => {
    if (this.model) {
      const rppg = this.model.predict([
        normalizedBatch,
        rawBatch,
      ]) as Tensor<Rank>;
      const rppgArray = rppg.dataSync();
      console.log("rppg predict length:", rppgArray.length);
      TensorStore.addRppgPltData(rppgArray); // 직접 TensorStore 사용
      console.log("rppgPltData after push:", TensorStore.rppgPltData.length);
    }
  };
}

export default Posprocessor;
