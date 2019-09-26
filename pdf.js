'use strict';

const pdfjsLib = require('pdfjs-dist');
const { extractPNG } = require('./images');
const path = require('path');
const os = require('os');
const fs = require('fs');
const util = require('util');
const { convertPDFPageToPNG } = require('./images2');
const uuid = require("uuid");


const writeFile = util.promisify(fs.writeFile);
const unlink = util.promisify(fs.unlink);

const kFBARequired = 0x00000010;
const kMinHeight = 20;
const pixelPerGrid = 24;
const LOGGER = console.log;

const tmpDir = path.join(os.tmpdir(), 'tmp-nodearch-pdf');


// creating tmp directory at the bootstrap
try {
  fs.lstatSync(tmpDir);
}
catch(e) {
  console.log(`creating tmp directory at ${tmpDir}`);
  fs.mkdirSync(tmpDir);
}

async function getForms({ src, scale = 1, generateImages = false }) {
  const filePath = await getPathFromBuffer(src) || src;

  const pdfjsConfig = {
    verbosity: pdfjsLib.VerbosityLevel.ERRORS
  };

  if (typeof src !== 'string') pdfjsConfig['data'] = src;
  else pdfjsConfig['url'] = src;

  const doc = await pdfjsLib.getDocument(pdfjsConfig).promise;

  const promises = [];

  for (let i = 1; i <= doc.numPages; i++) {
    promises.push(getAnnotations(filePath, doc, i, scale, generateImages));
  }

  const pages = await Promise.all(promises);

  await unlink(filePath);

  return mapInputs(pages);
}

async function getPathFromBuffer(buffer) {
  if (typeof buffer !== 'string') {
    const filePath = path.join(tmpDir, uuid.v4());
    await writeFile(filePath, buffer);

    return filePath;
  }
}

async function getAnnotations(filePath, doc, pageNumber, scale, generateImages) {
  const page = await doc.getPage(pageNumber);
  const inputs = await page.getAnnotations();
  const viewPort = page.getViewport({ scale });

  let image;

  if (generateImages) {
    image = await convertPDFPageToPNG(filePath, tmpDir, pageNumber - 1);
    // image = await extractPNG(page, viewPort);
  }

  return { pageNumber, inputs, viewPort, image };
}

function mapInputs(pages = []) {
  return pages.map(page => {

    page.inputs = page.inputs.map(input => {

      const position = getPosition(input, page.viewPort);

      return {
        name: input.fieldName,
        alternativeText: input.alternativeText,
        type: getInputType(page.inputs, input),
        required: isRequired(input),
        readonly: input.readOnly,
        value: input.fieldValue || undefined,
        position: {
          x: position.x,
          y: position.y
        },
        size: {
          width: position.w,
          height: position.h
        },
        checked: getCheckedOption(input),
        options: mapOptions(input.options),
        combo: input.combo,
        multiSelect: input.multiSelect,
        textAlignment: input.textAlignment,
        maxLen: input.maxLen,
        option: input.exportValue || input.buttonValue
      };
    });

    page.viewPort = {
      scale: page.viewPort.scale,
      rotation: page.viewPort.rotation,
      offsetX: page.viewPort.offsetX,
      offsetY: page.viewPort.offsetY,
      width: page.viewPort.width,
      height: page.viewPort.height
    };

    return page;
  });
}

function getPosition(input, viewPort) {
  const fieldRect = viewPort.convertToViewportRectangle(input.rect);
  const rect = pdfjsLib.Util.normalizeRect(fieldRect);

  let height = rect[3] - rect[1];

  return {
    x: rect[0],
    y: rect[1],
    w: rect[2] - rect[0],
    h: height
  };
}

function getInputType(inputs, inputInfo) {
  // TODO: handle check case
  if (inputInfo.fieldType === 'Btn') {
    if (inputInfo.radioButton) {
      return 'radioButton';
    }
    if (inputInfo.checkBox) {
      const found = inputs.filter(x => x.fieldName === inputInfo.fieldName);
      return found.length > 1 ? 'radioButton' : 'checkBox';
    }
    else if (inputInfo.pushButton) {
      return 'button';
    }
  }
  else if (inputInfo.fieldType === 'Tx') {
    return 'textBox';
  }
  else if (inputInfo.fieldType === 'Ch') {
    return 'dropdown';
  }
}

function isRequired(input) {
  let attributeMask = 0;

  if (input.fieldFlags & 0x00000002) {
    attributeMask |= kFBARequired;
  }

  return attributeMask === 16;
}

function getCheckedOption(input) {
  const option = input.exportValue || input.buttonValue;
  const selected = input.fieldValue;
  return option === selected;
}

function mapOptions(options = []) {
  if (options.length) {
    return options.map(op => {
      return {
        value: op.exportValue,
        display: op.displayValue
      };
    });
  }
}

function disableLogging() {
  console.log = () => { };
}

function enableLogging() {
  console.log = LOGGER;
}


module.exports = {
  getForms
};