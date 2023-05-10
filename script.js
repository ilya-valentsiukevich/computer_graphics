const WHITE_COLOR = "#ffffff";
const BLACK_COLOR = "#000000";

const SPACE_SEPARATOR = " ";
const SLASH_SEPARATOR = "/";

const GEOMETRIC_VERTICES = "v ";
const POLYGONAL_FACES = "f ";

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

  for (let i = 0; i < model.faces.length; i++) {
    const face = model.faces[i];

    for (let j = 0; j < 3; j++) {
      const v0 = model.vertices[face[j].vertexIndex];
      const v1 = model.vertices[face[(j + 1) % 3].vertexIndex];

      const x0 = (v0.x + 1) * halfWidth;
      const y0 = (v0.y + 1) * halfHeight;
      const x1 = (v1.x + 1) * halfWidth;
      const y1 = (v1.y + 1) * halfHeight;

      drawLine(x0, y0, x1, y1, ctx, BLACK_COLOR);
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
