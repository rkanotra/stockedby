import test from 'node:test';
import assert from 'node:assert/strict';
import { imageMime, imageExtractionRequest, imageExtractionText } from './image-input.js';
const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
test('image reader rejects spoofed extensions and non-image uploads', () => {
  assert.equal(imageMime(png, 'png'), 'image/png');
  assert.equal(imageMime(Buffer.from([255,216,255,224]), 'jpg'), 'image/jpeg');
  assert.equal(imageMime(Buffer.from('RIFFxxxxWEBPdata'), 'webp'), 'image/webp');
  assert.throws(() => imageMime(Buffer.from('<svg>active content</svg>'), 'png'), /not a valid/);
  assert.throws(() => imageMime(png, 'jpg'), /not a valid/);
  assert.throws(() => imageMime(Buffer.alloc(0), 'png'), /not a valid/);
});
test('vision input sends bytes with storage disabled and preserves model selection', () => {
  const input = imageExtractionRequest(png, 'png', 'gpt-4.1');
  assert.equal(input.store, false);
  assert.equal(input.model, 'gpt-4.1');
  assert.match(input.input[0].content[1].image_url, /^data:image\/png;base64,/);
  assert.equal(input.input[0].content[1].detail, 'high');
  assert.match(input.instructions, /untrusted source material/);
});
test('partial and refused image reads cannot become project evidence', () => {
  assert.throws(() => imageExtractionText({status:'incomplete',output_text:'half a diagram'}), /not be read completely/);
  assert.throws(() => imageExtractionText({status:'completed',output_text:''}), /not be read completely/);
  assert.match(imageExtractionText({status:'completed',output_text:'Visible text: Create a workspace.'}), /^\[AI-read image reference/);
});
