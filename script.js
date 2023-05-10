const WHITE_COLOR = "#ffffff";
const BLACK_COLOR = "#000000";
const RED_COLOR = "#ff0000";
const GREEN_COLOR = "#00ff00";

const SPACE_SEPARATOR = " ";
const SLASH_SEPARATOR = "/";

const GEOMETRIC_VERTICES = "v ";
const POLYGONAL_FACES = "f ";

const intensityToHexColor = (intensity) => {
  intensity = Math.floor(intensity);
  const clampedIntensity = Math.max(0, Math.min(intensity, 255));
  const hexString = clampedIntensity.toString(16).padStart(2, "0");
  return `#${hexString.repeat(3)}`;
};

const crossProduct = (v1, v2) => {
  const x = v1.y * v2.z - v1.z * v2.y;
  const y = v1.z * v2.x - v1.x * v2.z;
  const z = v1.x * v2.y - v1.y * v2.x;

  return { x, y, z };
};

const dotProduct = (v1, v2) => {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

const substractVectors = (v1, v2) => {
  const x = v1.x - v2.x;
  const y = v1.y - v2.y;
  const z = v1.z - v2.z;

  return { x, y, z };
};

const normalize = (v) => {
  const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  const x = v.x / magnitude;
  const y = v.y / magnitude;
  const z = v.z / magnitude;

  return { x, y, z };
};

class Model {
  constructor(parser) {
    this.vertices = [];
    this.faces = [];
    this.parser = parser;
  }

  addVertex(vertex) {
    this.vertices.push(vertex);
  }

  addFace(face) {
    this.faces.push(face);
  }
}

class ObjectFormatParser {
  parseVertex(line) {
    const parts = line.split(SPACE_SEPARATOR);
    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);

    return { x, y, z };
  }

  parseTriangle(line) {
    const parts = line.split(SPACE_SEPARATOR);
    const indices = [];

    for (let j = 1; j < parts.length; j++) {
      const indicesStr = parts[j].split(SLASH_SEPARATOR);
      const vertexIndex = parseInt(indicesStr[0]) - 1;
      const texCoordIndex = parseInt(indicesStr[1]) - 1;
      const normalIndex = parseInt(indicesStr[2]) - 1;
      indices.push({ vertexIndex, texCoordIndex, normalIndex });
    }

    const triangle = {
      ...indices,
    };

    return triangle;
  }
}

const readObjFile = (file, callback) => {
  const reader = new FileReader();
  reader.onload = () => {
    callback(reader.result);
  };

  reader.readAsText(file);
};

const parseObjFile = (objFileData) => {
  const model = new Model(new ObjectFormatParser());

  const lines = objFileData.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith(GEOMETRIC_VERTICES)) {
      const vertex = model.parser.parseVertex(line);
      model.addVertex(vertex);
    } else if (line.startsWith(POLYGONAL_FACES)) {
      const face = model.parser.parseTriangle(line);
      model.addFace(face);
    }
  }

  return model;
};

const drawPixel = (x, y, ctx, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
};

const drawLine = (x0, y0, x1, y1, ctx, color) => {
  let isSteep = false;

  if (Math.abs(y0 - y1) > Math.abs(x0 - x1)) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
    isSteep = true;
  }

  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }

  const dx = x1 - x0;
  const dy = y1 - y0;
  const derror = Math.abs(dy) * 2;

  let error = 0;
  let y = y0;

  for (let x = x0; x <= x1; x++) {
    if (isSteep) {
      drawPixel(y, x, ctx, color);
    } else {
      drawPixel(x, y, ctx, color);
    }

    error += derror;
    if (error > dx) {
      y += y1 > y0 ? 1 : -1;
      error -= 2 * dx;
    }
  }
};

const drawLineV2 = (v0, v1, ctx, color) => {
  drawLine(v0.x, v0.y, v1.x, v1.y, ctx, color);
};

const drawTriangle = (t0, t1, t2, ctx, color) => {
  if (t0.y == t1.y && t0.y == t2.y) return;

  if (t0.y > t1.y) [t0, t1] = [t1, t0];
  if (t0.y > t2.y) [t0, t2] = [t2, t0];
  if (t1.y > t2.y) [t1, t2] = [t2, t1];

  const totalHeight = t2.y - t0.y;

  for (let i = 0; i < totalHeight; i++) {
    const isSecondHalf = i > t1.y - t0.y || t1.y == t0.y;
    const segmentHeight = isSecondHalf ? t2.y - t1.y : t1.y - t0.y;
    const alpha = i / totalHeight;
    const beta = (i - (isSecondHalf ? t1.y - t0.y : 0)) / segmentHeight;
    let A = t0.x + (t2.x - t0.x) * alpha;
    let B = isSecondHalf
      ? t1.x + (t2.x - t1.x) * beta
      : t0.x + (t1.x - t0.x) * beta;
    if (A > B) [A, B] = [B, A];
    for (let x = A; x <= B; x++) {
      drawPixel(x, t0.y + i, ctx, color);
    }
  }
};

const drawModel = (model) => {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 800;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const halfWidth = width / 2;
  const halfHeight = height / 2;

  ctx.translate(0, height);
  ctx.scale(1, -1);

  const lightDir = { x: 0, y: 0, z: -1 };

  for (let i = 0; i < model.faces.length; i++) {
    const face = model.faces[i];

    const screenCoordinates = [];
    const worldCoordinates = [];

    for (let j = 0; j < 3; j++) {
      const vertex = model.vertices[face[j].vertexIndex];

      const x = (vertex.x + 1) * halfWidth;
      const y = (vertex.y + 1) * halfHeight;

      screenCoordinates.push({ x, y });
      worldCoordinates.push(vertex);
    }

    const intensity = dotProduct(
      normalize(
        crossProduct(
          substractVectors(worldCoordinates[2], worldCoordinates[0]),
          substractVectors(worldCoordinates[1], worldCoordinates[0])
        )
      ),
      lightDir
    );

    if (intensity > 0) {
      drawTriangle(
        screenCoordinates[0],
        screenCoordinates[1],
        screenCoordinates[2],
        ctx,
        intensityToHexColor(intensity * 255)
      );
    }
  }
};

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    readObjFile(file, (data) => {
      const model = parseObjFile(data);
      drawModel(model);
    });
  }
});
