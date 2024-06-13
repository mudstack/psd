// @webtoon/psd
// Copyright 2021-present NAVER WEBTOON
// MIT License

import { Depth } from '../../interfaces';
import { Cursor, UnsupportedDepth } from '../../utils';

export function readRawData(
  cursor: Cursor,
  depth: Depth,
  channelCount: number,
): { red: Uint8Array; green?: Uint8Array; blue?: Uint8Array; alpha?: Uint8Array } {
  // Calculate bytes per sample based on depth
  const bytesPerSample =
    depth === Depth.Eight ? 1 : depth === Depth.Sixteen ? 2 : depth === Depth.ThirtyTwo ? 4 : 0;

  if (bytesPerSample === 0) {
    throw new UnsupportedDepth(`Unsupported image bit depth: ${depth}`);
  }

  // Calculate the number of samples per channel
  const totalBytesPerChannel = (cursor.length - cursor.position) / channelCount;
  const samplesCountPerChannel = totalBytesPerChannel / bytesPerSample;

  const convertData = (data: DataView, depth: Depth): Uint8Array => {
    const result = new Uint8Array(samplesCountPerChannel);
    for (let i = 0; i < samplesCountPerChannel; i++) {
      if (depth === Depth.Eight) {
        result[i] = data.getUint8(i);
      } else if (depth === Depth.Sixteen) {
        const value = data.getUint16(i * 2);
        result[i] = Math.round((value / 65535) * 255);
      } else if (depth === Depth.ThirtyTwo) {
        const value = data.getFloat32(i * 4);
        result[i] = Math.min(255, Math.max(0, Math.round(value * 255)));
      }
    }
    return result;
  };

  const readChannelData = (): Uint8Array => {
    const channelData = cursor.extract(totalBytesPerChannel);
    return convertData(
      new DataView(channelData.buffer, channelData.byteOffset, totalBytesPerChannel),
      depth,
    );
  };

  const red = readChannelData();
  const green = channelCount >= 2 ? readChannelData() : undefined;
  const blue = channelCount >= 3 ? readChannelData() : undefined;
  const alpha = channelCount >= 4 ? readChannelData() : undefined;

  return { red, green, blue, alpha };
}
