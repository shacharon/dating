import {
  DetectFacesCommand,
  DetectModerationLabelsCommand,
  type DetectFacesCommandOutput,
  type DetectModerationLabelsCommandOutput,
} from '@aws-sdk/client-rekognition';

export const REKOGNITION = Symbol('REKOGNITION');

/** Injectable Rekognition surface for Nest DI and unit tests. */
export type RekognitionPort = {
  detectModerationLabels(
    input: ConstructorParameters<typeof DetectModerationLabelsCommand>[0],
  ): Promise<DetectModerationLabelsCommandOutput>;
  detectFaces?(
    input: ConstructorParameters<typeof DetectFacesCommand>[0],
  ): Promise<DetectFacesCommandOutput>;
};
