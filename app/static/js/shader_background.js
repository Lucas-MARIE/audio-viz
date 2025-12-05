/* ========== Visualisation de fond avec Shaders WebGL (inspiré de modV) ========== */

export class ShaderBackground {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.canvas = null;
    this.gl = null;
    this.program1 = null; // Premier shader (net)
    this.program2 = null; // Deuxième shader (flou)
    this.currentShaderIndex1 = 0;
    this.currentShaderIndex2 = 1;
    this.animationId = null;
    this.isInitialized = false;
    this.startTime = Date.now();
    
    // Framebuffers pour le rendu en deux passes
    this.fbo1 = null;
    this.fbo2 = null;
    this.texture1 = null;
    this.texture2 = null;
    
    // Liste de shaders audio-réactifs (inspirés de ISF - Interactive Shader Format)
    // Source: https://www.interactiveshaderformat.com/
    this.shaders = [
      // Shader 1: Rainbow Tunnel (inspiré ISF)
      {
        name: "Rainbow Tunnel",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            float angle = atan(p.y, p.x);
            float radius = length(p);
            
            // Tunnel effect
            float tunnel = 1.0 / radius;
            tunnel = mod(tunnel * 5.0 - time * 2.0 - audioLevel * 10.0, 1.0);
            
            // Rotation avec audio
            angle += time * 0.5 + audioMid * 2.0;
            
            // Rainbow colors
            vec3 color = 0.5 + 0.5 * cos(vec3(0.0, 0.33, 0.67) * PI * 2.0 + angle * 3.0 + time + audioLow * 5.0);
            color *= tunnel;
            color *= 1.0 + audioHigh * 2.0;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 2: Voronoi Cells (inspiré ISF)
      {
        name: "Voronoi Cells",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          vec2 random2(vec2 p) {
            return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv * 8.0;
            
            vec2 i_p = floor(p);
            vec2 f_p = fract(p);
            
            float minDist = 1.0;
            vec2 minPoint;
            
            for (int y = -1; y <= 1; y++) {
              for (int x = -1; x <= 1; x++) {
                vec2 neighbor = vec2(float(x), float(y));
                vec2 point = random2(i_p + neighbor);
                point = 0.5 + 0.5 * sin(time + 6.2831 * point + audioMid * 3.0);
                vec2 diff = neighbor + point - f_p;
                float dist = length(diff);
                
                if (dist < minDist) {
                  minDist = dist;
                  minPoint = point;
                }
              }
            }
            
            vec3 color = vec3(minPoint, 0.5 + 0.5 * sin(time + audioLow * 2.0));
            color *= 1.0 - minDist * (1.0 - audioLevel * 2.0);
            color += audioHigh * 0.5;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 3: Fractal Feedback (inspiré ISF)
      {
        name: "Fractal Feedback",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            float zoom = 1.0 + audioLevel * 2.0;
            p *= zoom;
            
            vec3 color = vec3(0.0);
            
            for (int i = 0; i < 5; i++) {
              float fi = float(i);
              
              // Rotation
              float angle = time * 0.3 + fi * 0.5 + audioMid * 2.0;
              float c = cos(angle);
              float s = sin(angle);
              p = mat2(c, -s, s, c) * p;
              
              // Kaleidoscope
              p = abs(p);
              p -= 0.5;
              
              // Accumulation de couleur
              color += 0.5 + 0.5 * cos(vec3(0.0, 0.33, 0.67) * PI * 2.0 + fi + time + audioLow * 3.0);
              color *= length(p) + audioHigh * 0.5;
            }
            
            color /= 5.0;
            color *= 1.0 + audioLevel;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 4: Audio Ripples (inspiré ISF)
      {
        name: "Audio Ripples",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            vec3 color = vec3(0.0);
            
            // Multiple ripple sources
            for (int i = 0; i < 4; i++) {
              float fi = float(i);
              float angle = fi * PI * 0.5 + time * 0.5;
              vec2 center = vec2(cos(angle), sin(angle)) * 0.5;
              
              float dist = length(p - center);
              float ripple = sin(dist * 20.0 - time * 3.0 - audioLevel * 10.0);
              ripple *= exp(-dist * 2.0);
              
              // Audio reactive colors
              vec3 rippleColor = vec3(
                0.5 + 0.5 * sin(fi + time + audioLow * 3.0),
                0.5 + 0.5 * sin(fi + time * 0.7 + audioMid * 2.0),
                0.5 + 0.5 * sin(fi + time * 0.3 + audioHigh * 4.0)
              );
              
              color += ripple * rippleColor;
            }
            
            color *= 0.5 + audioLevel * 1.5;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 5: Plasma Field (inspiré ISF)
      {
        name: "Plasma Field",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv * 5.0;
            
            float v = 0.0;
            v += sin((p.x + time + audioLow * 5.0));
            v += sin((p.y + time + audioMid * 4.0));
            v += sin((p.x + p.y + time + audioHigh * 3.0));
            p += vec2(cos(time * 0.5 + audioMid), sin(time * 0.7 + audioLow));
            v += sin(sqrt(p.x * p.x + p.y * p.y + 1.0) + time);
            v = v * 0.5;
            
            vec3 color = vec3(
              0.5 + 0.5 * sin(v * PI + audioLow * 2.0),
              0.5 + 0.5 * sin(v * PI + 2.094 + audioMid * 2.0),
              0.5 + 0.5 * sin(v * PI + 4.188 + audioHigh * 2.0)
            );
            
            color *= 1.0 + audioLevel * 1.5;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 6: Spiral Galaxy
      {
        name: "Spiral Galaxy",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            float angle = atan(p.y, p.x);
            float radius = length(p);
            
            float spiral = angle + radius * 5.0 - time * 2.0 - audioMid * 4.0;
            float brightness = sin(spiral * 3.0 + audioLow * 5.0) * 0.5 + 0.5;
            brightness *= exp(-radius * 0.5);
            
            vec3 color = vec3(
              0.3 + 0.7 * sin(time + audioLow),
              0.3 + 0.7 * sin(time * 0.7 + audioMid),
              0.8 + 0.2 * sin(time * 0.5 + audioHigh)
            );
            
            color *= brightness * (1.0 + audioLevel * 2.0);
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 7: Hexagonal Grid
      {
        name: "Hexagonal Grid",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          vec2 hexCoord(vec2 p) {
            float q = p.x;
            float r = p.y * 0.866025404;
            return vec2(q, r);
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 10.0;
            p.x *= resolution.x / resolution.y;
            
            vec2 hex = hexCoord(p);
            vec2 hexId = floor(hex);
            
            float pattern = sin(hexId.x + hexId.y + time + audioMid * 3.0);
            pattern += sin(length(hexId) * 0.5 - time * 0.5 + audioLow * 2.0);
            
            vec3 color = 0.5 + 0.5 * cos(vec3(0.0, 0.33, 0.67) * PI * 2.0 + pattern + audioHigh * 3.0);
            color *= 0.5 + audioLevel * 1.5;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 8: Neon Waves
      {
        name: "Neon Waves",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv * 2.0 - 1.0;
            p.x *= resolution.x / resolution.y;
            
            float wave1 = sin(p.x * 5.0 + time * 2.0 + audioLow * 5.0);
            float wave2 = sin(p.x * 3.0 - time * 1.5 + audioMid * 4.0);
            float wave3 = sin(p.x * 7.0 + time * 3.0 + audioHigh * 3.0);
            
            float dist1 = abs(p.y - wave1 * 0.3) * (1.0 + audioLevel);
            float dist2 = abs(p.y - wave2 * 0.4) * (1.0 + audioLevel);
            float dist3 = abs(p.y - wave3 * 0.2) * (1.0 + audioLevel);
            
            vec3 color = vec3(0.0);
            color += vec3(1.0, 0.3, 0.5) * (1.0 - smoothstep(0.0, 0.1, dist1));
            color += vec3(0.3, 1.0, 0.8) * (1.0 - smoothstep(0.0, 0.1, dist2));
            color += vec3(0.5, 0.3, 1.0) * (1.0 - smoothstep(0.0, 0.1, dist3));
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 9: Star Field
      {
        name: "Star Field",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          float random(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv * 20.0;
            
            p.y += time * (0.5 + audioMid * 2.0);
            
            vec2 i = floor(p);
            vec2 f = fract(p);
            
            float star = random(i);
            if (star > 0.95) {
              float dist = length(f - 0.5);
              float brightness = (1.0 - dist * 4.0) * (0.5 + audioLevel * 2.0);
              brightness *= sin(time * 3.0 + star * 100.0) * 0.5 + 0.5;
              
              vec3 color = vec3(
                brightness * (0.5 + audioLow * 0.5),
                brightness * (0.5 + audioMid * 0.5),
                brightness * (0.5 + audioHigh * 0.5)
              );
              
              gl_FragColor = vec4(color, 1.0);
            } else {
              gl_FragColor = vec4(0.0, 0.0, 0.05, 1.0);
            }
          }
        `
      },
      // Shader 10: Mandala
      {
        name: "Mandala",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            float angle = atan(p.y, p.x);
            float radius = length(p);
            
            float segments = 8.0 + floor(audioMid * 8.0);
            angle = mod(angle, PI * 2.0 / segments) * segments;
            
            vec2 pos = vec2(cos(angle), sin(angle)) * radius;
            
            float pattern = 0.0;
            for (float i = 1.0; i < 5.0; i++) {
              pattern += sin(radius * i * 10.0 - time * i + audioLow * 3.0) / i;
              pattern += cos(angle * i + time * 0.5 + audioHigh * 2.0) / i;
            }
            
            vec3 color = 0.5 + 0.5 * cos(vec3(0.0, 0.33, 0.67) * PI * 2.0 + pattern + time);
            color *= 1.0 + audioLevel * 1.5;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 11: Liquid Crystal
      {
        name: "Liquid Crystal",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv * 3.0;
            
            float pattern = 0.0;
            for (float i = 0.0; i < 5.0; i++) {
              vec2 offset = vec2(
                sin(time * 0.5 + i + audioLow * 2.0),
                cos(time * 0.7 + i + audioMid * 2.0)
              );
              pattern += sin(length(p + offset) * 5.0 - time * 2.0 + audioHigh * 3.0);
            }
            
            pattern /= 5.0;
            
            vec3 color = vec3(
              0.5 + 0.5 * sin(pattern * PI + time),
              0.5 + 0.5 * sin(pattern * PI + time + 2.0),
              0.5 + 0.5 * sin(pattern * PI + time + 4.0)
            );
            
            color *= 1.0 + audioLevel * 2.0;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 12: Grid Distortion
      {
        name: "Grid Distortion",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv * 10.0;
            
            p.x += sin(p.y * 2.0 + time + audioMid * 5.0) * (0.5 + audioLevel);
            p.y += cos(p.x * 2.0 - time + audioLow * 5.0) * (0.5 + audioLevel);
            
            vec2 grid = fract(p);
            float line = min(
              smoothstep(0.0, 0.1, grid.x) * smoothstep(1.0, 0.9, grid.x),
              smoothstep(0.0, 0.1, grid.y) * smoothstep(1.0, 0.9, grid.y)
            );
            
            vec3 color = vec3(1.0 - line);
            color *= vec3(
              0.5 + 0.5 * sin(time + audioLow * 2.0),
              0.5 + 0.5 * sin(time * 0.7 + audioMid * 2.0),
              0.5 + 0.5 * sin(time * 0.3 + audioHigh * 2.0)
            );
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 13: Sphere Mapping
      {
        name: "Sphere Mapping",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            float r = length(p);
            if (r < 1.0) {
              float z = sqrt(1.0 - r * r);
              vec3 sphere = normalize(vec3(p, z));
              
              float lat = asin(sphere.y);
              float lon = atan(sphere.z, sphere.x);
              
              float pattern = sin(lat * 10.0 + time + audioLow * 5.0);
              pattern += cos(lon * 10.0 - time * 0.5 + audioMid * 4.0);
              pattern *= audioLevel * 2.0;
              
              vec3 color = 0.5 + 0.5 * cos(vec3(0.0, 0.33, 0.67) * PI * 2.0 + pattern + audioHigh * 3.0);
              
              gl_FragColor = vec4(color, 1.0);
            } else {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
          }
        `
      },
      // Shader 14: Psychedelic Waves
      {
        name: "Psychedelic Waves",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv;
            
            vec3 color = vec3(0.0);
            
            for (float i = 0.0; i < 10.0; i++) {
              float t = time + i * 0.3;
              vec2 wave = vec2(
                sin(p.y * 5.0 + t + audioLow * 3.0) * 0.1,
                cos(p.x * 5.0 - t + audioMid * 3.0) * 0.1
              );
              
              p += wave * audioLevel;
              
              color += 0.5 + 0.5 * sin(vec3(0.0, 0.33, 0.67) * PI * 2.0 + i + t + audioHigh * 2.0);
            }
            
            color /= 10.0;
            color *= 1.5 + audioLevel;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 15: Matrix Rain
      {
        name: "Matrix Rain",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          float random(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv * vec2(50.0, 30.0);
            
            vec2 i = floor(p);
            vec2 f = fract(p);
            
            float speed = 1.0 + audioMid * 3.0;
            float y = fract(i.y / 30.0 - time * speed + random(vec2(i.x, 0.0)));
            
            float char = random(vec2(i.x, floor(time * 10.0 * speed + i.x)));
            float brightness = (1.0 - y) * (0.3 + audioLevel * 2.0);
            
            if (char > 0.5) {
              vec3 color = vec3(0.0, brightness, 0.0);
              color.r = audioLow * brightness * 0.3;
              color.b = audioHigh * brightness * 0.3;
              
              gl_FragColor = vec4(color, 1.0);
            } else {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
          }
        `
      },
      // Shader 16: Fire Effect
      {
        name: "Fire Effect",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = uv;
            
            float fire = 0.0;
            for (float i = 0.0; i < 5.0; i++) {
              float t = time * (1.0 + audioMid * 2.0);
              vec2 offset = vec2(
                noise(vec2(p.x * 10.0 + t, i)) - 0.5,
                t * 0.5
              );
              fire += noise(p * 5.0 + offset) * (1.0 - p.y);
            }
            
            fire = pow(fire, 2.0) * (1.0 + audioLevel * 2.0);
            
            vec3 color = vec3(
              fire * (1.0 + audioLow * 0.5),
              fire * 0.5 * (1.0 + audioMid * 0.3),
              fire * 0.1 * (1.0 + audioHigh * 0.2)
            );
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 17: Disco Ball
      {
        name: "Disco Ball",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            float angle = atan(p.y, p.x) + time * (0.5 + audioMid);
            float radius = length(p);
            
            float tiles = 20.0 + floor(audioHigh * 10.0);
            vec2 tile = vec2(
              mod(angle, PI * 2.0 / tiles) * tiles,
              radius * tiles
            );
            
            vec2 tileId = floor(tile);
            float brightness = mod(tileId.x + tileId.y, 2.0);
            brightness *= (1.0 - radius) * (1.0 + audioLevel * 3.0);
            brightness *= sin(time * 5.0 + tileId.x + tileId.y + audioLow * 5.0) * 0.5 + 0.5;
            
            vec3 color = vec3(brightness);
            color *= vec3(
              0.5 + 0.5 * sin(time + audioLow * 2.0),
              0.5 + 0.5 * sin(time * 0.7 + audioMid * 2.0),
              0.5 + 0.5 * sin(time * 0.3 + audioHigh * 2.0)
            );
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 18: Chromatic Aberration
      {
        name: "Chromatic Aberration",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 center = vec2(0.5);
            vec2 offset = (uv - center) * (0.02 + audioLevel * 0.05);
            
            vec2 uvR = uv - offset * audioLow;
            vec2 uvG = uv;
            vec2 uvB = uv + offset * audioHigh;
            
            float patternR = sin(uvR.x * 10.0 + time + audioLow * 5.0) * sin(uvR.y * 10.0 - time);
            float patternG = sin(uvG.x * 10.0 + time * 0.7 + audioMid * 4.0) * sin(uvG.y * 10.0 - time * 0.7);
            float patternB = sin(uvB.x * 10.0 + time * 0.3 + audioHigh * 3.0) * sin(uvB.y * 10.0 - time * 0.3);
            
            vec3 color = vec3(
              0.5 + 0.5 * patternR,
              0.5 + 0.5 * patternG,
              0.5 + 0.5 * patternB
            );
            
            color *= 1.0 + audioLevel * 1.5;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 19: Warp Speed
      {
        name: "Warp Speed",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            float angle = atan(p.y, p.x);
            float radius = length(p);
            
            float speed = 2.0 + audioMid * 5.0;
            float lines = mod(radius * 50.0 - time * speed, 1.0);
            lines = smoothstep(0.8, 1.0, lines);
            
            float fade = exp(-radius * 0.5) * (1.0 + audioLevel * 2.0);
            
            vec3 color = vec3(lines) * fade;
            color *= vec3(
              0.3 + audioLow * 0.7,
              0.5 + audioMid * 0.5,
              0.8 + audioHigh * 0.2
            );
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 20: Glitch Art
      {
        name: "Glitch Art",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          float random(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            
            float glitchIntensity = audioLevel * 0.3;
            
            if (random(vec2(floor(time * 10.0), floor(uv.y * 20.0))) < glitchIntensity) {
              uv.x += (random(vec2(time, uv.y)) - 0.5) * 0.1 * audioMid;
            }
            
            vec2 p = uv * 10.0;
            float pattern = sin(p.x + time + audioLow * 5.0) * sin(p.y - time * 0.7 + audioHigh * 3.0);
            
            vec3 color = vec3(
              0.5 + 0.5 * sin(pattern + time),
              0.5 + 0.5 * sin(pattern + time + 2.0),
              0.5 + 0.5 * sin(pattern + time + 4.0)
            );
            
            if (random(vec2(time * 5.0, floor(uv.y * 100.0))) < audioHigh * 0.2) {
              color = vec3(random(uv + time));
            }
            
            color *= 1.0 + audioLevel * 1.5;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      },
      // Shader 21: Stereo Mirror Explosion (Inspiré du design de Romain)
      {
        name: "Stereo Mirror Explosion",
        fragment: `
          precision mediump float;
          uniform float time;
          uniform vec2 resolution;
          uniform float audioLevel;
          uniform float audioLow;
          uniform float audioMid;
          uniform float audioHigh;
          
          #define PI 3.14159265359
          #define NUM_POINTS 64.0
          
          float hash(float n) {
            return fract(sin(n) * 43758.5453);
          }
          
          vec3 getNeonColor(float index, float intensity) {
            // Palette néon comme dans le code original
            float hues[6];
            hues[0] = 320.0; hues[1] = 270.0; hues[2] = 220.0;
            hues[3] = 180.0; hues[4] = 120.0; hues[5] = 60.0;
            
            int paletteIndex = int(mod(index * 6.0, 6.0));
            float hue = hues[paletteIndex] + intensity * 40.0;
            float lightness = 0.5 + intensity * 0.3;
            
            // HSL to RGB
            float c = (1.0 - abs(2.0 * lightness - 1.0));
            float h = hue / 60.0;
            float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
            
            vec3 rgb;
            if (h < 1.0) rgb = vec3(c, x, 0.0);
            else if (h < 2.0) rgb = vec3(x, c, 0.0);
            else if (h < 3.0) rgb = vec3(0.0, c, x);
            else if (h < 4.0) rgb = vec3(0.0, x, c);
            else if (h < 5.0) rgb = vec3(x, 0.0, c);
            else rgb = vec3(c, 0.0, x);
            
            float m = lightness - c * 0.5;
            return rgb + m;
          }
          
          float drawStereoSide(vec2 p, float side, float mirror) {
            // side: -1.0 pour gauche, 1.0 pour droite
            // mirror: 1.0 pour haut, -1.0 pour bas
            
            float baseRadius = 0.05;
            vec2 center = vec2(0.0);
            float maxDist = length(vec2(1.0, 1.0));
            
            float result = 0.0;
            
            for (float i = 0.0; i < NUM_POINTS; i += 1.0) {
              float t = i / NUM_POINTS;
              
              // Angle pour le demi-cercle
              float angle;
              if (side < 0.0) {
                // Gauche: de PI à 0
                angle = PI - t * PI;
              } else {
                // Droite: de 0 à PI
                angle = t * PI;
              }
              
              // Appliquer le miroir vertical
              if (mirror < 0.0) {
                angle = 2.0 * PI - angle;
              }
              
              // Direction
              vec2 dir = vec2(cos(angle), sin(angle));
              
              // Simuler les données audio (utiliser les fréquences)
              float freqIndex = t * 0.6; // Concentré sur les basses
              float audioValue;
              if (freqIndex < 0.33) audioValue = audioLow;
              else if (freqIndex < 0.66) audioValue = audioMid;
              else audioValue = audioHigh;
              
              // Ajouter variation temporelle
              audioValue = audioValue * (0.8 + 0.2 * sin(time * 2.0 + i * 0.1));
              audioValue = pow(audioValue, 3.0); // Courbe cubique comme l'original
              
              // Distance du rayon
              float dist = baseRadius + (maxDist - baseRadius) * audioValue;
              vec2 point = center + dir * dist;
              
              // Distance du pixel au rayon
              float pixelDist = length(p - point);
              
              // Contribution de ce point (ligne)
              float contribution = exp(-pixelDist * 80.0) * audioValue;
              
              // Couleur néon
              vec3 neonColor = getNeonColor(t, audioValue);
              
              result += contribution * (neonColor.r + neonColor.g + neonColor.b) / 3.0;
            }
            
            return result;
          }
          
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec2 p = (uv - 0.5) * 2.0;
            p.x *= resolution.x / resolution.y;
            
            // Effet de trainée (comme l'original avec ctx.fillStyle rgba)
            vec3 trail = vec3(0.02, 0.02, 0.06);
            
            // Dessiner les 4 quadrants (stéréo + miroir)
            float left_top = drawStereoSide(p, -1.0, 1.0);
            float left_bottom = drawStereoSide(p, -1.0, -1.0);
            float right_top = drawStereoSide(p, 1.0, 1.0);
            float right_bottom = drawStereoSide(p, 1.0, -1.0);
            
            float total = left_top + left_bottom + right_top + right_bottom;
            
            // Couleur finale avec palette néon dynamique
            float t = length(p);
            vec3 neonColor = getNeonColor(t + time * 0.2, total);
            
            vec3 color = trail + neonColor * total * (1.0 + audioLevel * 2.0);
            
            // Bloom effect (comme le blur dans l'original)
            color = pow(color, vec3(0.8));
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      }
    ];
  }

  async initialize(canvasId = 'bgCanvas') {
    if (this.isInitialized) return;

    // Créer le canvas s'il n'existe pas
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.zIndex = '-999';
      this.canvas.style.opacity = '1';
      this.canvas.style.pointerEvents = 'none';
      document.body.insertBefore(this.canvas, document.body.firstChild);
    }

    // Initialiser WebGL
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!this.gl) {
      console.error('WebGL non supporté');
      return;
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Créer les framebuffers pour le multi-pass rendering
    this.createFramebuffers();

    // Charger deux shaders aléatoires différents
    this.loadRandomShaders();
    
    this.isInitialized = true;
    console.log('Shader background initialized successfully with dual layers');
  }

  createFramebuffers() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Texture 1 pour le premier shader
    this.texture1 = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture1);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Framebuffer 1
    this.fbo1 = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo1);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture1, 0);

    // Texture 2 pour le deuxième shader
    this.texture2 = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture2);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Framebuffer 2
    this.fbo2 = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo2);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture2, 0);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  loadRandomShaders() {
    // Choisir deux shaders aléatoires différents
    const index1 = Math.floor(Math.random() * this.shaders.length);
    let index2 = Math.floor(Math.random() * this.shaders.length);
    while (index2 === index1) {
      index2 = Math.floor(Math.random() * this.shaders.length);
    }
    
    this.currentShaderIndex1 = index1;
    this.currentShaderIndex2 = index2;
    
    this.loadShaderPair();
    
    this.isInitialized = true;
    console.log('Shader background initialized successfully');
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      
      // Recréer les framebuffers si déjà initialisés
      if (this.isInitialized) {
        this.createFramebuffers();
      }
    }
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  loadShader(index) {
    if (index < 0 || index >= this.shaders.length) return;
    
    this.currentShaderIndex1 = index;
    // Choisir un deuxième shader différent
    this.currentShaderIndex2 = (index + Math.floor(Math.random() * (this.shaders.length - 1)) + 1) % this.shaders.length;
    
    this.loadShaderPair();
  }

  loadShaderPair() {
    const shader1 = this.shaders[this.currentShaderIndex1];
    const shader2 = this.shaders[this.currentShaderIndex2];
    
    // Vertex shader simple (fullscreen quad)
    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    
    // Créer le premier programme (shader net)
    const fragmentShader1 = this.createShader(this.gl.FRAGMENT_SHADER, shader1.fragment);
    if (vertexShader && fragmentShader1) {
      if (this.program1) {
        this.gl.deleteProgram(this.program1);
      }
      
      this.program1 = this.gl.createProgram();
      this.gl.attachShader(this.program1, vertexShader);
      this.gl.attachShader(this.program1, fragmentShader1);
      this.gl.linkProgram(this.program1);
      
      if (!this.gl.getProgramParameter(this.program1, this.gl.LINK_STATUS)) {
        console.error('Program 1 linking error:', this.gl.getProgramInfoLog(this.program1));
      }
    }
    
    // Créer le deuxième programme (shader avec flou)
    const fragmentShader2 = this.createShader(this.gl.FRAGMENT_SHADER, shader2.fragment);
    if (vertexShader && fragmentShader2) {
      if (this.program2) {
        this.gl.deleteProgram(this.program2);
      }
      
      this.program2 = this.gl.createProgram();
      this.gl.attachShader(this.program2, vertexShader);
      this.gl.attachShader(this.program2, fragmentShader2);
      this.gl.linkProgram(this.program2);
      
      if (!this.gl.getProgramParameter(this.program2, this.gl.LINK_STATUS)) {
        console.error('Program 2 linking error:', this.gl.getProgramInfoLog(this.program2));
      }
    }
    
    // Setup fullscreen quad (partagé entre les programmes)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);
    
    this.quadBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    console.log(`Loaded shader pair: "${shader1.name}" (sharp) + "${shader2.name}" (blurred)`);
  }

  getAudioData() {
    if (!this.audioManager.analyser || !this.audioManager.dataArray) {
      return { level: 0, low: 0, mid: 0, high: 0 };
    }
    
    this.audioManager.analyser.getByteFrequencyData(this.audioManager.dataArray);
    const data = this.audioManager.dataArray;
    const len = data.length;
    
    // Calculer les niveaux audio par bande de fréquence
    const lowEnd = Math.floor(len * 0.1);
    const midEnd = Math.floor(len * 0.5);
    
    let low = 0, mid = 0, high = 0;
    
    for (let i = 0; i < lowEnd; i++) low += data[i];
    for (let i = lowEnd; i < midEnd; i++) mid += data[i];
    for (let i = midEnd; i < len; i++) high += data[i];
    
    low /= (lowEnd * 255);
    mid /= ((midEnd - lowEnd) * 255);
    high /= ((len - midEnd) * 255);
    
    const level = (low + mid + high) / 3;
    
    return { level, low, mid, high };
  }

  render() {
    if (!this.gl || !this.program1 || !this.program2) return;
    
    const time = (Date.now() - this.startTime) / 1000;
    const audio = this.getAudioData();
    
    // ===== PASS 1: Render premier shader (net) vers texture1 =====
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo1);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    this.gl.useProgram(this.program1);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLocation1 = this.gl.getAttribLocation(this.program1, 'position');
    this.gl.enableVertexAttribArray(positionLocation1);
    this.gl.vertexAttribPointer(positionLocation1, 2, this.gl.FLOAT, false, 0, 0);
    
    // Set uniforms pour shader 1
    this.setShaderUniforms(this.program1, time, audio);
    
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    
    // ===== PASS 2: Render deuxième shader (flou) vers texture2 =====
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo2);
    
    this.gl.useProgram(this.program2);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLocation2 = this.gl.getAttribLocation(this.program2, 'position');
    this.gl.enableVertexAttribArray(positionLocation2);
    this.gl.vertexAttribPointer(positionLocation2, 2, this.gl.FLOAT, false, 0, 0);
    
    // Set uniforms pour shader 2
    this.setShaderUniforms(this.program2, time, audio);
    
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    
    // ===== PASS 3: Composer les deux shaders avec flou et transparence =====
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    this.composeLayers();
  }

  setShaderUniforms(program, time, audio) {
    const timeLocation = this.gl.getUniformLocation(program, 'time');
    const resolutionLocation = this.gl.getUniformLocation(program, 'resolution');
    const audioLevelLocation = this.gl.getUniformLocation(program, 'audioLevel');
    const audioLowLocation = this.gl.getUniformLocation(program, 'audioLow');
    const audioMidLocation = this.gl.getUniformLocation(program, 'audioMid');
    const audioHighLocation = this.gl.getUniformLocation(program, 'audioHigh');
    
    this.gl.uniform1f(timeLocation, time);
    this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(audioLevelLocation, audio.level);
    this.gl.uniform1f(audioLowLocation, audio.low);
    this.gl.uniform1f(audioMidLocation, audio.mid);
    this.gl.uniform1f(audioHighLocation, audio.high);
  }

  composeLayers() {
    // Créer un shader de composition qui mélange les deux textures
    if (!this.composeProgram) {
      const vertexShader = this.createShader(this.gl.VERTEX_SHADER, `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      
      const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform sampler2D layer1; // Shader net
        uniform sampler2D layer2; // Shader flou
        varying vec2 vUv;
        
        // Fonction de flou gaussien simple
        vec4 blur(sampler2D tex, vec2 uv, float strength) {
          vec4 color = vec4(0.0);
          float total = 0.0;
          
          for (float x = -4.0; x <= 4.0; x += 1.0) {
            for (float y = -4.0; y <= 4.0; y += 1.0) {
              vec2 offset = vec2(x, y) * strength / 1000.0;
              float weight = exp(-(x*x + y*y) / 8.0);
              color += texture2D(tex, uv + offset) * weight;
              total += weight;
            }
          }
          
          return color / total;
        }
        
        void main() {
          vec4 sharp = texture2D(layer1, vUv); // Shader net
          vec4 blurred = blur(layer2, vUv, 3.0); // Shader avec flou
          
          // Mélanger les deux couches avec transparence
          vec4 final = sharp * 0.6; // Couche nette à 60% d'opacité
          final += blurred * 0.5; // Couche floue à 50% d'opacité
          
          gl_FragColor = final;
        }
      `);
      
      this.composeProgram = this.gl.createProgram();
      this.gl.attachShader(this.composeProgram, vertexShader);
      this.gl.attachShader(this.composeProgram, fragmentShader);
      this.gl.linkProgram(this.composeProgram);
    }
    
    this.gl.useProgram(this.composeProgram);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    const positionLocation = this.gl.getAttribLocation(this.composeProgram, 'position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    
    // Bind textures
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture1);
    this.gl.uniform1i(this.gl.getUniformLocation(this.composeProgram, 'layer1'), 0);
    
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture2);
    this.gl.uniform1i(this.gl.getUniformLocation(this.composeProgram, 'layer2'), 1);
    
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  start() {
    if (!this.isInitialized) {
      console.warn('Shader background pas encore initialisé');
      return;
    }
    
    if (this.animationId) {
      console.log('Animation déjà en cours');
      return;
    }

    console.log('Démarrage de l\'animation Shader');
    
    const render = () => {
      this.render();
      this.animationId = requestAnimationFrame(render);
    };

    render();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  nextShader() {
    // Changer les deux shaders pour de nouveaux aléatoires
    this.loadRandomShaders();
  }

  previousShader() {
    // Changer les deux shaders pour de nouveaux aléatoires
    this.loadRandomShaders();
  }

  toggle() {
    if (this.canvas) {
      const isVisible = this.canvas.style.opacity !== '0';
      if (isVisible) {
        this.canvas.style.opacity = '0';
        document.body.classList.add('bg-hidden');
      } else {
        this.canvas.style.opacity = '1';
        document.body.classList.remove('bg-hidden');
      }
      return !isVisible;
    }
    return false;
  }

  destroy() {
    this.stop();
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.isInitialized = false;
  }
}
