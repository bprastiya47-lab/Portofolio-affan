interface WebGLProbeResult {
  supported: boolean;
  isSoftwareGl: boolean;
}

let cachedProbe: WebGLProbeResult | null = null;

function probeWebGL(): WebGLProbeResult {
  if (cachedProbe) return cachedProbe;
  if (typeof document === 'undefined') {
    cachedProbe = { supported: false, isSoftwareGl: false };
    return cachedProbe;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedProbe = { supported: false, isSoftwareGl: true };
      return cachedProbe;
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);

    cachedProbe = { supported: true, isSoftwareGl: isSoftware };
    return cachedProbe;
  } catch {
    cachedProbe = { supported: false, isSoftwareGl: true };
    return cachedProbe;
  }
}

export const detectSoftwareWebGL = (): boolean => probeWebGL().isSoftwareGl;

export const supportsWebGL = (): boolean => probeWebGL().supported;
