/* ============================================
   SIMPLE GIF ENCODER
   Light-weight GIF89a encoder for animated GIFs
   Based on omggif by deanm (public domain)
   ============================================ */

(function() {
  'use strict';

  function GifWriter(buf, width, height, gopts) {
    let p = 0;
    const gopts_ = gopts === undefined ? {} : gopts;
    const loop_count = gopts_.loop === undefined ? null : gopts_.loop;
    let palette = gopts_.palette === undefined ? null : gopts_.palette;
    if (width <= 0 || height <= 0 || width > 65535 || height > 65535) throw new Error('Bad width/height');

    buf[p++] = 0x47; buf[p++] = 0x49; buf[p++] = 0x46; // GIF
    buf[p++] = 0x38; buf[p++] = 0x39; buf[p++] = 0x61; // 89a
    let gp_num_colors_pow2 = 0;
    let background = 0;
    buf[p++] = width & 0xff; buf[p++] = (width >> 8) & 0xff;
    buf[p++] = height & 0xff; buf[p++] = (height >> 8) & 0xff;
    buf[p++] = (palette !== null ? 0x80 : 0) | gp_num_colors_pow2;
    buf[p++] = background; buf[p++] = 0;

    if (palette !== null) {
      for (let i = 0, il = palette.length; i < il; ++i) {
        const rgb = palette[i];
        buf[p++] = (rgb >> 16) & 0xff;
        buf[p++] = (rgb >> 8) & 0xff;
        buf[p++] = rgb & 0xff;
      }
    }

    if (loop_count !== null) {
      if (loop_count < 0 || loop_count > 65535) throw new Error('Loop count must be 0..65535');
      buf[p++] = 0x21; buf[p++] = 0xff; buf[p++] = 0x0b;
      buf[p++] = 0x4e; buf[p++] = 0x45; buf[p++] = 0x54; buf[p++] = 0x53;
      buf[p++] = 0x43; buf[p++] = 0x41; buf[p++] = 0x50; buf[p++] = 0x45;
      buf[p++] = 0x32; buf[p++] = 0x2e; buf[p++] = 0x30;
      buf[p++] = 0x03; buf[p++] = 0x01;
      buf[p++] = loop_count & 0xff; buf[p++] = (loop_count >> 8) & 0xff;
      buf[p++] = 0x00;
    }

    let ended = false;

    this.addFrame = function(x, y, w, h, indexed_pixels, opts) {
      if (ended === true) { --p; ended = false; }
      opts = opts === undefined ? {} : opts;
      if (x < 0 || y < 0 || x > 65535 || y > 65535) throw new Error('x/y invalid');
      if (w <= 0 || h <= 0 || w > 65535 || h > 65535) throw new Error('w/h invalid');
      if (indexed_pixels.length < w * h) throw new Error('Not enough pixels');

      const using_local_palette = opts.palette !== undefined && opts.palette !== null;
      const fpalette = using_local_palette ? opts.palette : palette;
      const fdelay = opts.delay === undefined ? 0 : opts.delay;
      const fdisposal = opts.disposal === undefined ? 0 : opts.disposal;
      if (fdisposal < 0 || fdisposal > 3) throw new Error('Disposal out of range');

      let transparent_flag = false;
      let transparent_index = 0;
      if (opts.transparent !== undefined && opts.transparent !== null) {
        transparent_flag = true;
        transparent_index = opts.transparent;
        if (transparent_index < 0 || transparent_index >= fpalette.length) throw new Error('Transparent index invalid');
      }

      if (fdisposal !== 0 || transparent_flag || fdelay !== 0) {
        buf[p++] = 0x21; buf[p++] = 0xf9;
        buf[p++] = 0x4;
        buf[p++] = fdisposal << 2 | (transparent_flag === true ? 1 : 0);
        buf[p++] = fdelay & 0xff; buf[p++] = (fdelay >> 8) & 0xff;
        buf[p++] = transparent_index;
        buf[p++] = 0;
      }

      buf[p++] = 0x2c;
      buf[p++] = x & 0xff; buf[p++] = (x >> 8) & 0xff;
      buf[p++] = y & 0xff; buf[p++] = (y >> 8) & 0xff;
      buf[p++] = w & 0xff; buf[p++] = (w >> 8) & 0xff;
      buf[p++] = h & 0xff; buf[p++] = (h >> 8) & 0xff;

      let lp_num_colors_pow2 = 0;
      let lp_num_colors = fpalette.length;
      while (lp_num_colors >>= 1) ++lp_num_colors_pow2;
      lp_num_colors = 1 << lp_num_colors_pow2;
      lp_num_colors_pow2 = (lp_num_colors_pow2 - 1) & 0x7;

      buf[p++] = using_local_palette ? (0x80 | lp_num_colors_pow2) : 0;

      if (using_local_palette) {
        for (let i = 0, il = fpalette.length; i < il; ++i) {
          const rgb = fpalette[i];
          buf[p++] = (rgb >> 16) & 0xff;
          buf[p++] = (rgb >> 8) & 0xff;
          buf[p++] = rgb & 0xff;
        }
      }

      p = GifWriterOutputLZWCodeStream(
        buf, p, lp_num_colors_pow2 < 2 ? 2 : lp_num_colors_pow2 + 1, indexed_pixels);
      return p;
    };

    this.end = function() {
      if (ended === false) {
        buf[p++] = 0x3b;
        ended = true;
      }
      return p;
    };

    this.getOutputBuffer = function() { return buf; };
    this.setOutputBufferPosition = function(v) { p = v; };
    this.getOutputBufferPosition = function() { return p; };
  }

  function GifWriterOutputLZWCodeStream(buf, p, min_code_size, index_stream) {
    buf[p++] = min_code_size;
    let cur_subblock = p++;

    const clear_code = 1 << min_code_size;
    const code_mask = clear_code - 1;
    const eoi_code = clear_code + 1;
    let next_code = eoi_code + 1;

    let cur_code_size = min_code_size + 1;
    let cur_shift = 0;
    let cur = 0;

    function emit_bytes_to_buffer(bit_block_size) {
      while (cur_shift >= bit_block_size) {
        buf[p++] = cur & 0xff;
        cur >>= 8;
        cur_shift -= 8;
        if (p === cur_subblock + 256) {
          buf[cur_subblock] = 255;
          cur_subblock = p++;
        }
      }
    }

    function emit_code(c) {
      cur |= c << cur_shift;
      cur_shift += cur_code_size;
      emit_bytes_to_buffer(8);
    }

    let ib_code = index_stream[0] & code_mask;
    let code_table = {};

    emit_code(clear_code);

    for (let i = 1, il = index_stream.length; i < il; ++i) {
      const k = index_stream[i] & code_mask;
      const cur_key = ib_code << 8 | k;
      const cur_code = code_table[cur_key];

      if (cur_code === undefined) {
        cur |= ib_code << cur_shift;
        cur_shift += cur_code_size;
        while (cur_shift >= 8) {
          buf[p++] = cur & 0xff;
          cur >>= 8;
          cur_shift -= 8;
          if (p === cur_subblock + 256) {
            buf[cur_subblock] = 255;
            cur_subblock = p++;
          }
        }

        if (next_code === 4096) {
          emit_code(clear_code);
          next_code = eoi_code + 1;
          cur_code_size = min_code_size + 1;
          code_table = {};
        } else {
          if (next_code >= (1 << cur_code_size)) ++cur_code_size;
          code_table[cur_key] = next_code++;
        }

        ib_code = k;
      } else {
        ib_code = cur_code;
      }
    }

    cur |= ib_code << cur_shift;
    cur_shift += cur_code_size;
    emit_bytes_to_buffer(8);

    emit_code(eoi_code);

    emit_bytes_to_buffer(1);

    if (cur_subblock + 1 === p) {
      buf[cur_subblock] = 0;
    } else {
      buf[cur_subblock] = p - cur_subblock - 1;
      buf[p++] = 0;
    }
    return p;
  }

  // ============ HIGH-LEVEL GIF BUILDER ============
  // Quantize RGB to 256-color palette using median-cut-like approach
  function quantizeFrames(frames) {
    // Build a global palette from all frames using simple bucketing
    const buckets = {};
    frames.forEach(frame => {
      for (let i = 0; i < frame.data.length; i += 4) {
        const r = frame.data[i] & 0xF8;
        const g = frame.data[i + 1] & 0xF8;
        const b = frame.data[i + 2] & 0xF8;
        const key = (r << 16) | (g << 8) | b;
        buckets[key] = (buckets[key] || 0) + 1;
      }
    });

    // Take top 256
    const sorted = Object.keys(buckets).sort((a, b) => buckets[b] - buckets[a]);
    const palette = sorted.slice(0, 256).map(k => parseInt(k));
    while (palette.length < 256) palette.push(0);

    // Build lookup table
    function findClosest(r, g, b) {
      let best = 0, bestDist = Infinity;
      for (let i = 0; i < palette.length; i++) {
        const pr = (palette[i] >> 16) & 0xff;
        const pg = (palette[i] >> 8) & 0xff;
        const pb = palette[i] & 0xff;
        const dr = pr - r, dg = pg - g, db = pb - b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      return best;
    }

    // Index each frame
    const cache = new Map();
    const indexed = frames.map(frame => {
      const idx = new Uint8Array(frame.data.length / 4);
      for (let i = 0, j = 0; i < frame.data.length; i += 4, j++) {
        const r = frame.data[i];
        const g = frame.data[i + 1];
        const b = frame.data[i + 2];
        const key = (r << 16) | (g << 8) | b;
        let p = cache.get(key);
        if (p === undefined) {
          p = findClosest(r, g, b);
          cache.set(key, p);
        }
        idx[j] = p;
      }
      return idx;
    });

    return { palette, indexed };
  }

  /**
   * Create an animated GIF blob from an array of canvas elements.
   * @param {HTMLCanvasElement[]} canvases - Array of same-sized canvases.
   * @param {number} delayMs - Delay between frames in ms.
   * @returns {Promise<Blob>}
   */
  window.createGifBlob = async function(canvases, delayMs = 500) {
    if (!canvases || canvases.length === 0) throw new Error('No frames');
    const w = canvases[0].width;
    const h = canvases[0].height;

    // Get pixel data for each frame
    const framesData = canvases.map(c => {
      const ctx = c.getContext('2d');
      return ctx.getImageData(0, 0, w, h);
    });

    // Quantize
    const { palette, indexed } = quantizeFrames(framesData);

    // Estimate buffer size generously
    const estSize = w * h * canvases.length * 2 + 1024 + palette.length * 3;
    const buf = new Uint8Array(estSize);
    const gif = new GifWriter(buf, w, h, { palette, loop: 0 });

    const delayCs = Math.max(2, Math.round(delayMs / 10));
    indexed.forEach(idx => {
      gif.addFrame(0, 0, w, h, idx, { delay: delayCs });
    });
    const finalSize = gif.end();

    return new Blob([buf.slice(0, finalSize)], { type: 'image/gif' });
  };

})();
