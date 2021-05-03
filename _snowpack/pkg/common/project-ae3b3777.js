import { C as COORDINATE_SYSTEM, P as PROJECTION_MODE, p as getUniformsFromViewport } from './layer-660a8390.js';

var fp32shader = "#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND\nconst float TWO_PI = 6.2831854820251465;\nconst float PI_2 = 1.5707963705062866;\nconst float PI_16 = 0.1963495463132858;\n\nconst float SIN_TABLE_0 = 0.19509032368659973;\nconst float SIN_TABLE_1 = 0.3826834261417389;\nconst float SIN_TABLE_2 = 0.5555702447891235;\nconst float SIN_TABLE_3 = 0.7071067690849304;\n\nconst float COS_TABLE_0 = 0.9807852506637573;\nconst float COS_TABLE_1 = 0.9238795042037964;\nconst float COS_TABLE_2 = 0.8314695954322815;\nconst float COS_TABLE_3 = 0.7071067690849304;\n\nconst float INVERSE_FACTORIAL_3 = 1.666666716337204e-01;\nconst float INVERSE_FACTORIAL_5 = 8.333333767950535e-03;\nconst float INVERSE_FACTORIAL_7 = 1.9841270113829523e-04;\nconst float INVERSE_FACTORIAL_9 = 2.75573188446287533e-06;\n\nfloat sin_taylor_fp32(float a) {\n  float r, s, t, x;\n\n  if (a == 0.0) {\n    return 0.0;\n  }\n\n  x = -a * a;\n  s = a;\n  r = a;\n\n  r = r * x;\n  t = r * INVERSE_FACTORIAL_3;\n  s = s + t;\n\n  r = r * x;\n  t = r * INVERSE_FACTORIAL_5;\n  s = s + t;\n\n  r = r * x;\n  t = r * INVERSE_FACTORIAL_7;\n  s = s + t;\n\n  r = r * x;\n  t = r * INVERSE_FACTORIAL_9;\n  s = s + t;\n\n  return s;\n}\n\nvoid sincos_taylor_fp32(float a, out float sin_t, out float cos_t) {\n  if (a == 0.0) {\n    sin_t = 0.0;\n    cos_t = 1.0;\n  }\n  sin_t = sin_taylor_fp32(a);\n  cos_t = sqrt(1.0 - sin_t * sin_t);\n}\n\nfloat tan_taylor_fp32(float a) {\n    float sin_a;\n    float cos_a;\n\n    if (a == 0.0) {\n        return 0.0;\n    }\n    float z = floor(a / TWO_PI);\n    float r = a - TWO_PI * z;\n\n    float t;\n    float q = floor(r / PI_2 + 0.5);\n    int j = int(q);\n\n    if (j < -2 || j > 2) {\n        return 0.0 / 0.0;\n    }\n\n    t = r - PI_2 * q;\n\n    q = floor(t / PI_16 + 0.5);\n    int k = int(q);\n    int abs_k = int(abs(float(k)));\n\n    if (abs_k > 4) {\n        return 0.0 / 0.0;\n    } else {\n        t = t - PI_16 * q;\n    }\n\n    float u = 0.0;\n    float v = 0.0;\n\n    float sin_t, cos_t;\n    float s, c;\n    sincos_taylor_fp32(t, sin_t, cos_t);\n\n    if (k == 0) {\n        s = sin_t;\n        c = cos_t;\n    } else {\n        if (abs(float(abs_k) - 1.0) < 0.5) {\n            u = COS_TABLE_0;\n            v = SIN_TABLE_0;\n        } else if (abs(float(abs_k) - 2.0) < 0.5) {\n            u = COS_TABLE_1;\n            v = SIN_TABLE_1;\n        } else if (abs(float(abs_k) - 3.0) < 0.5) {\n            u = COS_TABLE_2;\n            v = SIN_TABLE_2;\n        } else if (abs(float(abs_k) - 4.0) < 0.5) {\n            u = COS_TABLE_3;\n            v = SIN_TABLE_3;\n        }\n        if (k > 0) {\n            s = u * sin_t + v * cos_t;\n            c = u * cos_t - v * sin_t;\n        } else {\n            s = u * sin_t - v * cos_t;\n            c = u * cos_t + v * sin_t;\n        }\n    }\n\n    if (j == 0) {\n        sin_a = s;\n        cos_a = c;\n    } else if (j == 1) {\n        sin_a = c;\n        cos_a = -s;\n    } else if (j == -1) {\n        sin_a = -c;\n        cos_a = s;\n    } else {\n        sin_a = -s;\n        cos_a = -c;\n    }\n    return sin_a / cos_a;\n}\n#endif\n\nfloat tan_fp32(float a) {\n#ifdef LUMA_FP32_TAN_PRECISION_WORKAROUND\n  return tan_taylor_fp32(a);\n#else\n  return tan(a);\n#endif\n}\n";
var fp32 = {
  name: 'fp32',
  vs: fp32shader,
  fs: null
};

var COORDINATE_SYSTEM_GLSL_CONSTANTS = Object.keys(COORDINATE_SYSTEM).map(function (key) {
  return "const int COORDINATE_SYSTEM_".concat(key, " = ").concat(COORDINATE_SYSTEM[key], ";");
}).join('');
var PROJECTION_MODE_GLSL_CONSTANTS = Object.keys(PROJECTION_MODE).map(function (key) {
  return "const int PROJECTION_MODE_".concat(key, " = ").concat(PROJECTION_MODE[key], ";");
}).join('');
var projectShader = "".concat(COORDINATE_SYSTEM_GLSL_CONSTANTS, "\n").concat(PROJECTION_MODE_GLSL_CONSTANTS, "\n\nuniform int project_uCoordinateSystem;\nuniform int project_uProjectionMode;\nuniform float project_uScale;\nuniform bool project_uWrapLongitude;\nuniform vec3 project_uCommonUnitsPerMeter;\nuniform vec3 project_uCommonUnitsPerWorldUnit;\nuniform vec3 project_uCommonUnitsPerWorldUnit2;\nuniform vec4 project_uCenter;\nuniform mat4 project_uModelMatrix;\nuniform mat4 project_uViewProjectionMatrix;\nuniform vec2 project_uViewportSize;\nuniform float project_uDevicePixelRatio;\nuniform float project_uFocalDistance;\nuniform vec3 project_uCameraPosition;\nuniform vec3 project_uCoordinateOrigin;\n\nconst float TILE_SIZE = 512.0;\nconst float PI = 3.1415926536;\nconst float WORLD_SCALE = TILE_SIZE / (PI * 2.0);\nconst vec3 ZERO_64_LOW = vec3(0.0);\nconst float EARTH_RADIUS = 6370972.0;\nconst float GLOBE_RADIUS = 256.0;\nfloat project_size(float meters) {\n  return meters * project_uCommonUnitsPerMeter.z;\n}\n\nvec2 project_size(vec2 meters) {\n  return meters * project_uCommonUnitsPerMeter.xy;\n}\n\nvec3 project_size(vec3 meters) {\n  return meters * project_uCommonUnitsPerMeter;\n}\n\nvec4 project_size(vec4 meters) {\n  return vec4(meters.xyz * project_uCommonUnitsPerMeter, meters.w);\n}\nvec3 project_normal(vec3 vector) {\n  vec4 normal_modelspace = project_uModelMatrix * vec4(vector, 0.0);\n  return normalize(normal_modelspace.xyz * project_uCommonUnitsPerMeter);\n}\n\nvec4 project_offset_(vec4 offset) {\n  float dy = offset.y;\n  if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT) {\n    dy = clamp(dy, -1., 1.);\n  }\n  vec3 commonUnitsPerWorldUnit = project_uCommonUnitsPerWorldUnit + project_uCommonUnitsPerWorldUnit2 * dy;\n  return vec4(offset.xyz * commonUnitsPerWorldUnit, offset.w);\n}\nvec2 project_mercator_(vec2 lnglat) {\n  float x = lnglat.x;\n  if (project_uWrapLongitude) {\n    x = mod(x + 180., 360.0) - 180.;\n  }\n  float y = clamp(lnglat.y, -89.9, 89.9);\n  return vec2(\n    radians(x) + PI,\n    PI + log(tan_fp32(PI * 0.25 + radians(y) * 0.5))\n  );\n}\n\nvec3 project_globe_(vec3 lnglatz) {\n  float lambda = radians(lnglatz.x);\n  float phi = radians(lnglatz.y);\n  float cosPhi = cos(phi);\n  float D = (lnglatz.z / EARTH_RADIUS + 1.0) * GLOBE_RADIUS;\n\n  return vec3(\n    sin(lambda) * cosPhi,\n    -cos(lambda) * cosPhi,\n    sin(phi)\n  ) * D;\n}\nvec4 project_position(vec4 position, vec3 position64Low) {\n  vec4 position_world = project_uModelMatrix * position;\n  if (project_uProjectionMode == PROJECTION_MODE_WEB_MERCATOR) {\n    if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT) {\n      return vec4(\n        project_mercator_(position_world.xy) * WORLD_SCALE,\n        project_size(position_world.z),\n        position_world.w\n      );\n    }\n    if (project_uCoordinateSystem == COORDINATE_SYSTEM_CARTESIAN) {\n      position_world.xyz += project_uCoordinateOrigin;\n    }\n  }\n  if (project_uProjectionMode == PROJECTION_MODE_GLOBE) {\n    if (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT) {\n      return vec4(\n        project_globe_(position_world.xyz),\n        position_world.w\n      );\n    }\n  }\n  if (project_uProjectionMode == PROJECTION_MODE_IDENTITY ||\n    (project_uProjectionMode == PROJECTION_MODE_WEB_MERCATOR_AUTO_OFFSET &&\n    (project_uCoordinateSystem == COORDINATE_SYSTEM_LNGLAT ||\n     project_uCoordinateSystem == COORDINATE_SYSTEM_CARTESIAN))) {\n    position_world.xyz -= project_uCoordinateOrigin;\n  }\n  return project_offset_(position_world + project_uModelMatrix * vec4(position64Low, 0.0));\n}\n\nvec4 project_position(vec4 position) {\n  return project_position(position, ZERO_64_LOW);\n}\n\nvec3 project_position(vec3 position, vec3 position64Low) {\n  vec4 projected_position = project_position(vec4(position, 1.0), position64Low);\n  return projected_position.xyz;\n}\n\nvec3 project_position(vec3 position) {\n  vec4 projected_position = project_position(vec4(position, 1.0), ZERO_64_LOW);\n  return projected_position.xyz;\n}\n\nvec2 project_position(vec2 position) {\n  vec4 projected_position = project_position(vec4(position, 0.0, 1.0), ZERO_64_LOW);\n  return projected_position.xy;\n}\n\nvec4 project_common_position_to_clipspace(vec4 position, mat4 viewProjectionMatrix, vec4 center) {\n  return viewProjectionMatrix * position + center;\n}\nvec4 project_common_position_to_clipspace(vec4 position) {\n  return project_common_position_to_clipspace(position, project_uViewProjectionMatrix, project_uCenter);\n}\nvec2 project_pixel_size_to_clipspace(vec2 pixels) {\n  vec2 offset = pixels / project_uViewportSize * project_uDevicePixelRatio * 2.0;\n  return offset * project_uFocalDistance;\n}\n\nfloat project_size_to_pixel(float meters) {\n  return project_size(meters) * project_uScale;\n}\nfloat project_pixel_size(float pixels) {\n  return pixels / project_uScale;\n}\nvec2 project_pixel_size(vec2 pixels) {\n  return pixels / project_uScale;\n}\nmat3 project_get_orientation_matrix(vec3 up) {\n  vec3 uz = normalize(up);\n  vec3 ux = abs(uz.z) == 1.0 ? vec3(1.0, 0.0, 0.0) : normalize(vec3(uz.y, -uz.x, 0));\n  vec3 uy = cross(uz, ux);\n  return mat3(ux, uy, uz);\n}\n\nbool project_needs_rotation(vec3 commonPosition, out mat3 transform) {\n  if (project_uProjectionMode == PROJECTION_MODE_GLOBE) {\n    transform = project_get_orientation_matrix(commonPosition);\n    return true;\n  }\n  return false;\n}\n");

var INITIAL_MODULE_OPTIONS = {};

function getUniforms() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : INITIAL_MODULE_OPTIONS;

  if (opts.viewport) {
    return getUniformsFromViewport(opts);
  }

  return {};
}

var project = {
  name: 'project',
  dependencies: [fp32],
  vs: projectShader,
  getUniforms: getUniforms
};

export { project as p };