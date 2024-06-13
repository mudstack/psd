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
  const bytesPerSample =
    depth === Depth.Eight ? 1 : depth === Depth.Sixteen ? 2 : depth === Depth.ThirtyTwo ? 4 : 0;

  if (bytesPerSample === 0) {
    throw new UnsupportedDepth(`Unsupported image bit depth: ${depth}`);
  }

  const totalBytesForAllChannels = cursor.length - cursor.position;
  const samplesCountPerChannel = totalBytesForAllChannels / bytesPerSample / channelCount;

  const convertData = (data: DataView, count: number): Uint8Array => {
    const result = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      if (depth === Depth.Eight) {
        result[i] = data.getUint8(i);
      } else if (depth === Depth.Sixteen) {
        // Convert 16-bit data to 8-bit by scaling
        const index = i * 2; // Each 16-bit sample occupies 2 bytes
        const value = data.getUint16(index, false); // Assuming big-endian format
        result[i] = Math.floor(value / 257); // Scale down from 0-65535 to 0-255
      } else if (depth === Depth.ThirtyTwo) {
        // Convert 32-bit floating point data to 8-bit
        const index = i * 4; // Each 32-bit float occupies 4 bytes
        const value = data.getFloat32(index, false); // Assuming big-endian format
        result[i] = Math.min(255, Math.max(0, Math.round(value * 255))); // Scale from 0.0-1.0 to 0-255
      } else {
        result[i] = 0;
      }
    }
    return result;
  };

  const readChannelData = (): Uint8Array => {
    const bytesForChannel = samplesCountPerChannel * bytesPerSample;
    const channelData = cursor.extract(bytesForChannel);
    cursor.pass(bytesForChannel); // Move the cursor forward after reading
    return convertData(
      new DataView(channelData.buffer, channelData.byteOffset, channelData.byteLength),
      samplesCountPerChannel,
    );
  };

  const red = readChannelData();
  const green = channelCount >= 2 ? readChannelData() : undefined;
  const blue = channelCount >= 3 ? readChannelData() : undefined;
  const alpha = channelCount >= 4 ? readChannelData() : undefined;

  return { red, green, blue, alpha };
}
