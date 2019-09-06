import hummus from 'hummus';
import {IFillFormData, IFillFormOptions} from './interface';

const BUFFER_SIZE = 10000;


function readStreamToString(handles: any, stream: any) {
  let buff = '';

  const readStream = handles.reader.startReadingFromStream(stream);

  while (readStream.notEnded()) {
    const readData = readStream.read(BUFFER_SIZE);
    buff += readData.reduce((acc: any, item: any) => acc + String.fromCharCode(item), '');
  }

  return buff;
}


function getOriginalTextFieldAppearanceStreamCode(handles: any, fieldDictionary: any) {
  // get the single appearance stream for the text, field. we'll use it to recreate the new one
  const appearanceInField = fieldDictionary.exists('Subtype') && (fieldDictionary.queryObject('Subtype')
  .toString() == 'Widget') || !fieldDictionary.exists('Kids');

  let appearanceParent = null;

  if (appearanceInField) {
    appearanceParent = fieldDictionary;
  } else {
    if (fieldDictionary.exists('Kids')) {
      const kidsArray = handles.reader.queryDictionaryObject(fieldDictionary, 'Kids').toPDFArray();

      if (kidsArray.getLength() > 0) {
        appearanceParent = handles.reader.queryArrayObject(0).toPDFDictionary();
      }
    }
  }

  if (!appearanceParent)
    return null;

  if (!appearanceParent.exists('AP'))
    return null;

  const appearance = handles.reader.queryDictionaryObject(appearanceParent, 'AP').toPDFDictionary();

  if (!appearance.exists('N'))
    return null;

  const appearanceXObject = handles.reader.queryDictionaryObject(appearance, 'N').toPDFStream();

  return readStreamToString(handles, appearanceXObject);
}

function writeAppearanceXObjectForText(handles: any, formId: any, fieldsDictionary: any, text: any, inheritedProperties: any) {
  const rect = handles.reader.queryDictionaryObject(fieldsDictionary, 'Rect').toPDFArray().toJSArray();
  const da = fieldsDictionary.exists('DA') ? fieldsDictionary.queryObject('DA').toString() : inheritedProperties['DA'];
  const q = fieldsDictionary.exists('Q') ? fieldsDictionary.queryObject('Q').toNumber() : inheritedProperties['Q'];

  if (handles.options.debug) {
    console.debug('creating new appearance with:');
    console.debug('da =', da);
    console.debug('q =', q);
    console.debug('fieldsDictionary =', fieldsDictionary.toJSObject());
    console.debug('inheritedProperties =', inheritedProperties);
    console.debug('text =', text);
  }

  const originalAppearanceContent = getOriginalTextFieldAppearanceStreamCode(handles, fieldsDictionary);
  let before = '';
  let after = '';

  if (!!originalAppearanceContent) {
    const pre = originalAppearanceContent.indexOf('/Tx BMC');
    if (pre !== -1) {
      before = originalAppearanceContent.substr(0, pre);

      const post = originalAppearanceContent.indexOf('EMC', pre + '/Tx BMC'.length);

      if (post !== -1) {
        after = originalAppearanceContent.substr(post + 'EMC'.length)
      }
    } else {
      before = originalAppearanceContent;
    }
  }

  const boxWidth = rect[2].value - rect[0].value;
  const boxHeight = rect[3].value - rect[1].value;

  const xObjectForm: any = handles.writer.createFormXObject(0, 0, boxWidth, boxHeight, formId);

  // If default text options setup, use them to determine the text appearance. including quad support, horizontal centering etc.
  // Otherwise, use naive method: Will use Tj with "code" encoding to write the text, assuming encoding should work (??). if it won't i need real fonts here
  // and DA is not gonna be useful. so for now let's use as is.
  // For the same reason i'm not support Quad, as well

  // Should be able to parse the following from the DA, and map to system font
  // temporarily, let user input the values
  const textOptions = handles.options.defaultTextOptions;

  if (textOptions) {
    // grab text dimensions for quad support and vertical centering
    const textDimensions = textOptions.font.calculateTextDimensions(text, textOptions.size);

    // vertical centering
    const yPos = (boxHeight - textDimensions.height) / 2;
    // horizontal pos per quad
    const quad = q || 0;

    let xPos = 0;

    switch (quad) {
      case 0:
        // left align
        xPos = 0;
        break;
      case 1:
        // center
        xPos = (boxWidth - textDimensions.width) / 2;
        break;
      case 2:
        // right align
        xPos = (boxWidth - textDimensions.width);
    }

    xObjectForm.getContentContext()
    .writeFreeCode(before)
    .writeFreeCode('/Tx BMC\r\n')
    .q()
    .writeText(text, xPos, yPos, textOptions)
    .Q()
    .writeFreeCode('EMC')
    .writeFreeCode(after);
  }
  else {
    // Naive form, no quad support...and text may not show and may be mispositioned
    xObjectForm.getContentContext()
    .writeFreeCode(before)
    .writeFreeCode('/Tx BMC\r\n')
    .q()
    .BT()
    .writeFreeCode(da + '\r\n')
    .TD(0, 4.5)
    .Tj(text, {encoding: 'code'})
    .ET()
    .Q()
    .writeFreeCode('EMC')
    .writeFreeCode(after);
  }

  // register to copy resources from form default resources dict [would have been better to just refer to it...
  // but alas don't have access for xObject resources dict].
  // Later note: well, we do need to add the fonts on occasion...
  if (handles.acroformDict.exists('DR')) {
    handles.writer.getEvents().once('OnResourcesWrite', (args: any) => {
      // copy all but the keys that exist already
      const dr = handles.reader.queryDictionaryObject(handles.acroformDict, 'DR').toPDFDictionary().toJSObject();
      Object.getOwnPropertyNames(dr).forEach((element) => {
        if (element !== 'ProcSet' && (!textOptions || element !== 'Font')) {
          args.pageResourcesDictionaryContext.writeKey(element);
          handles.copyingContext.copyDirectObjectAsIs(dr[element]);
        }
      });
    });
  }

  handles.writer.endFormXObject(xObjectForm);
}

function writeFieldWithAppearanceForText(handles: any, targetFieldDict: any, sourceFieldDictionary: any, appearanceInField: any, textToWrite: any, inheritedProperties: any) {
  // determine how to write appearance
  const newAppearanceFormId = handles.objectsContext.allocateNewObjectID();

  if (appearanceInField) {
    // Appearance in field - so write appearance dict in field
    targetFieldDict
    .writeKey('AP');

    const apDict = handles.objectsContext.startDictionary();

    apDict.writeKey("N").writeObjectReferenceValue(newAppearanceFormId);
    handles.objectsContext
    .endDictionary(apDict)
    .endDictionary(targetFieldDict)
    .endIndirectObject();

  } else {
    // finish the field object
    handles.objectsContext
    .endDictionary(targetFieldDict)
    .endIndirectObject();

    // write in kid (there should be just one)
    const kidsArray = handles.reader.queryDictionaryObject(sourceFieldDictionary, 'Kids').toPDFArray();
    const fieldsReferences = writeKidsAndEndObject(handles, targetFieldDict, kidsArray);

    // recreate widget kid, with new stream reference
    const fieldReference = fieldsReferences[0];

    let sourceField;

    if (fieldReference.existing) {
      handles.objectsContext.startModifiedIndirectObject(fieldReference.id);
      sourceField = handles.reader.parseNewObject(fieldReference.id).toPDFDictionary();
    } else {
      handles.objectsContext.startNewIndirectObject(fieldReference.id);
      sourceField = fieldReference.field.toPDFDictionary();
    }

    const modifiedDict = startModifiedDictionary(handles, sourceField, {'AP': -1});
    modifiedDict
    .writeKey('AP');

    const apDict = handles.objectsContext.startDictionary();
    apDict.writeKey("N").writeObjectReferenceValue(newAppearanceFormId);
    handles.objectsContext
    .endDictionary(apDict)
    .endDictionary(modifiedDict)
    .endIndirectObject();
  }

  // write the new stream xObject
  writeAppearanceXObjectForText(handles, newAppearanceFormId, sourceFieldDictionary, textToWrite, inheritedProperties);
}

function updateChoiceValue(handles: any, fieldDictionary: any, value: any, inheritedProperties: any) {
  const appearanceInField = fieldDictionary.exists('Subtype') && (fieldDictionary.queryObject('Subtype')
  .toString() == 'Widget') || !fieldDictionary.exists('Kids');

  const fieldsToRemove: any = {'V': -1};

  if (appearanceInField) {
    // add skipping AP if in field (and not in a child widget)
    fieldsToRemove['AP'] = -1;
  }

  const modifiedDict = startModifiedDictionary(handles, fieldDictionary, fieldsToRemove);

  // start with value, setting per one or multiple selection. also choose the text to write in appearance
  let textToWrite;

  if (typeof (value) === 'string') {
    // one option
    modifiedDict
    .writeKey('V')
    .writeLiteralStringValue(new hummus.PDFTextString(value).toBytesArray());
    textToWrite = value;
  } else {
    // multiple options
    modifiedDict
    .writeKey('V');
    handles.objectsContext.startArray();

    value.forEach((singleValue: any) => {
      handles.objectsContext.writeLiteralString(new hummus.PDFTextString(singleValue).toBytesArray());
    });

    handles.objectsContext.endArray();
    textToWrite = value.length > 0 ? value[0] : '';
  }

  writeFieldWithAppearanceForText(handles, modifiedDict, fieldDictionary, appearanceInField, textToWrite, inheritedProperties);
}

function updateTextValue(handles: any, fieldDictionary: any, value: any, isRich: any, inheritedProperties: any) {
  if (typeof (value) === 'string') {
    value = {v: value, rv: value};
  }

  const appearanceInField = fieldDictionary.exists('Subtype') && (fieldDictionary.queryObject('Subtype')
  .toString() == 'Widget') || !fieldDictionary.exists('Kids');

  const fieldsToRemove: any = {'V': -1};

  if (appearanceInField) {
    // add skipping AP if in field (and not in a child widget)
    fieldsToRemove['AP'] = -1;
  }

  if (isRich) {
    // skip RV if rich
    fieldsToRemove['RV'] = -1;
  }

  const modifiedDict = startModifiedDictionary(handles, fieldDictionary, fieldsToRemove);

  // start with value, setting both plain value and rich value
  modifiedDict
  .writeKey('V')
  .writeLiteralStringValue(new hummus.PDFTextString(value['v']).toBytesArray());

  if (isRich) {
    modifiedDict
    .writeKey('RV')
    .writeLiteralStringValue(new hummus.PDFTextString(value['rv']).toBytesArray());
  }

  writeFieldWithAppearanceForText(handles, modifiedDict, fieldDictionary, appearanceInField, value['v'], inheritedProperties);
}


/**
 * Update radio button value. look for the field matching the value, which should be an index.
 * Set its ON appearance as the value, and set all radio buttons appearance to off, but the selected one which should be on
 */
function updateOptionButtonValue(handles: any, fieldDictionary: any, value: any) {
  const isWidget = fieldDictionary.exists('Subtype') && (fieldDictionary.queryObject('Subtype').toString() == 'Widget');

  if (isWidget || !fieldDictionary.exists('Kids')) {
    // this radio button has just one option and its in the widget. also means no kids
    const modifiedDict = startModifiedDictionary(handles, fieldDictionary, {'V': -1, 'AS': -1});

    let appearanceName;

    if (value === null) {
      // false is easy, just write '/Off' as the value and as the appearance stream
      appearanceName = 'Off';
    } else {
      // grab the non off value. that should be the yes one
      const apDictionary = handles.reader.queryDictionaryObject(fieldDictionary, 'AP').toPDFDictionary();
      const nAppearances = handles.reader.queryDictionaryObject(apDictionary, 'N').toPDFDictionary().toJSObject();

      appearanceName = Object.keys(nAppearances || {}).find((item: any) => {
        return item !== 'Off';
      });
    }

    modifiedDict
    .writeKey('V')
    .writeNameValue(appearanceName)
    .writeKey('AS')
    .writeNameValue(appearanceName);

    handles.objectsContext
    .endDictionary(modifiedDict)
    .endIndirectObject();
  } else {
    // Field. this would mean that there's a kid array, and there are offs and ons to set
    const modifiedDict = startModifiedDictionary(handles, fieldDictionary, {'V': -1, 'Kids': -1});
    const kidsArray = handles.reader.queryDictionaryObject(fieldDictionary, 'Kids').toPDFArray();

    let appearanceName;

    if (value === null) {
      // false is easy, just write '/Off' as the value and as the appearance stream
      appearanceName = 'Off';
    } else {
      // grab the non off value. that should be the yes one
      const widgetDictionary = handles.reader.queryArrayObject(kidsArray, value).toPDFDictionary();
      const apDictionary = handles.reader.queryDictionaryObject(widgetDictionary, 'AP').toPDFDictionary();
      const nAppearances = handles.reader.queryDictionaryObject(apDictionary, 'N').toPDFDictionary().toJSObject();

      appearanceName = Object.keys(nAppearances || {}).find((item: any) => {
        return item !== 'Off';
      });
    }

    // set the V value on the new field dictionary
    modifiedDict
    .writeKey('V')
    .writeNameValue(appearanceName);

    // write the Kids key before we write the kids array
    modifiedDict.writeKey('Kids');

    // write the kids array, similar to writeFilledFields, but knowing that these are widgets and that AS needs to be set
    const fieldsReferences = writeKidsAndEndObject(handles, modifiedDict, kidsArray);

    // recreate widget kids, turn on or off based on their relation to the target value
    for (let i = 0; i < fieldsReferences.length; ++i) {
      const fieldReference = fieldsReferences[i];
      let sourceField;

      if (fieldReference.existing) {
        handles.objectsContext.startModifiedIndirectObject(fieldReference.id);
        sourceField = handles.reader.parseNewObject(fieldReference.id).toPDFDictionary();
      } else {
        handles.objectsContext.startNewIndirectObject(fieldReference.id);
        sourceField = fieldReference.field.toPDFDictionary();
      }

      const modifiedFieldDict = startModifiedDictionary(handles, sourceField, {'AS': -1});

      if (value === i) {
        // this widget should be on
        modifiedFieldDict
        .writeKey('AS')
        .writeNameValue(appearanceName);  // note that we have saved it earlier
      } else {
        // this widget should be off
        modifiedFieldDict
        .writeKey('AS')
        .writeNameValue('Off');

      }
      // finish
      handles.objectsContext
      .endDictionary(modifiedFieldDict)
      .endIndirectObject();
    }
  }
}

function defaultTerminalFieldWrite(handles: any, fieldDictionary: any) {
  // default write of ending field. no reason to recurse to kids
  handles.copyingContext
  .copyDirectObjectAsIs(fieldDictionary)
  .endIndirectObject();
}

function writeFieldAndKids(handles: any, fieldDictionary: any, inheritedProperties: any, baseFieldName: any) {
  // this field or widget doesn't need value rewrite. but its kids might. so write the dictionary as is, dropping kids.
  // write them later and recurse.

  const modifiedFieldDict = startModifiedDictionary(handles, fieldDictionary, {'Kids': -1});

  // if kids exist, continue to them for extra filling!
  const kids = fieldDictionary.exists('Kids') ?
    handles.reader.queryDictionaryObject(fieldDictionary, 'Kids').toPDFArray() : null;

  if (kids) {
    const localEnv: any = {};

    // prep some inherited values and push env
    if (fieldDictionary.exists('FT'))
      localEnv['FT'] = fieldDictionary.queryObject('FT').toString();
    if (fieldDictionary.exists('Ff'))
      localEnv['Ff'] = fieldDictionary.queryObject('Ff').toNumber();
    if (fieldDictionary.exists('DA'))
      localEnv['DA'] = fieldDictionary.queryObject('DA').toString();
    if (fieldDictionary.exists('Q'))
      localEnv['Q'] = fieldDictionary.queryObject('Q').toNumber();
    if (fieldDictionary.exists('Opt'))
      localEnv['Opt'] = fieldDictionary.queryObject('Opt').toPDFArray();

    modifiedFieldDict.writeKey('Kids');

    // recurse to kids. note that this will take care of ending this object
    writeFilledFields(handles, modifiedFieldDict, kids, Object.assign({}, inheritedProperties, localEnv), baseFieldName + '.');
  } else {
    // no kids, can finish object now
    handles.objectsContext
    .endDictionary(modifiedFieldDict)
    .endIndirectObject();
  }
}

/**
 * Update a field. splits to per type functions
 */
function updateFieldWithValue(handles: any, fieldDictionary: any, value: any, inheritedProperties: any) {
  // Update a field with value. There is a logical assumption made here:
  // This must be a terminal field. meaning it is a field, and it either has no kids, it also holding
  // Widget data or that it has one or more kids defining its widget annotation(s). Normally it would be
  // One but in the case of a radio button, where there's one per option.
  const localFieldType = fieldDictionary.exists('FT') ? fieldDictionary.queryObject('FT').toString() : undefined;
  const fieldType = localFieldType || inheritedProperties['FT'];
  const localFlags = fieldDictionary.exists('Ff') ? fieldDictionary.queryObject('Ff').toNumber() : undefined;
  const flags = localFlags === undefined ? inheritedProperties['Ff'] : localFlags;

  // the rest is fairly type dependent, so let's check the type
  switch (fieldType) {
    case 'Btn': {
      if ((flags >> 16) & 1) {
        // push button. can't write a value. forget it.
        defaultTerminalFieldWrite(handles, fieldDictionary);
      } else {
        // checkbox or radio button
        updateOptionButtonValue(handles, fieldDictionary, (flags >> 15) & 1 ? value : (value ? 0 : null));
      }
      break;
    }
    case 'Tx': {
      // rich or plain text
      updateTextValue(handles, fieldDictionary, value, (flags >> 25) & 1, inheritedProperties);
      break;
    }
    case 'Ch': {
      updateChoiceValue(handles, fieldDictionary, value, inheritedProperties);
      break;
    }
    case 'Sig': {
      // signature, ain't handling that. should return or throw an error sometimes
      defaultTerminalFieldWrite(handles, fieldDictionary);
      break;
    }
    default: {
      // in case there's a fault and there's no type, or it's irrelevant
      defaultTerminalFieldWrite(handles, fieldDictionary);
    }
  }
}

/**
 * toText function. should get this into hummus proper sometimes
 */
function toText(item: any) {
  if (item.getType() === hummus.ePDFObjectLiteralString) {
    return item.toPDFLiteralString().toText();
  } else if (item.getType() === hummus.ePDFObjectHexString) {
    return item.toPDFHexString().toText();
  } else {
    return item.value;
  }
}

/**
 * writes a single field. will fill with value if found in data.
 * assuming that's in indirect object and having to write the dict,finish the dict, indirect object and write the kids
 */
function writeFilledField(handles: any, fieldDictionary: any, inheritedProperties: any, baseFieldName: any) {
  const localFieldNameT = fieldDictionary.exists('T') ? toText(fieldDictionary.queryObject('T')) : undefined;
  const fullName = localFieldNameT === undefined ? baseFieldName : (baseFieldName + localFieldNameT);

  // Based on the fullName we can now determine whether the field has a value that needs setting
  if (handles.data[fullName]) {
    // We got a winner! write with updated value
    updateFieldWithValue(handles, fieldDictionary, handles.data[fullName], inheritedProperties);
  } else {
    // Not yet. write and recurse to kids
    writeFieldAndKids(handles, fieldDictionary, inheritedProperties, fullName);
  }
}

/**
 * Write kids array converting each direct kids to an indirect one
 */
function writeKidsAndEndObject(handles: any, parentDict: any, kidsArray: any) {
  const fieldsReferences: any = [];
  const fieldJSArray = kidsArray.toJSArray();

  handles.objectsContext.startArray();

  fieldJSArray.forEach((field: any) => {
    if (field.getType() === hummus.ePDFObjectIndirectObjectReference) {
      // existing reference, keep as is
      handles.copyingContext.copyDirectObjectAsIs(field);
      fieldsReferences.push({existing: true, id: field.toPDFIndirectObjectReference().getObjectID()});
    } else {
      const newFieldObjectId = handles.objectsContext.allocateNewObjectID();

      // direct object, recreate as reference
      fieldsReferences.push({existing: false, id: newFieldObjectId, theObject: field});
      handles.copyingContext.writeIndirectObjectReference(newFieldObjectId);
    }
  });

  handles.objectsContext
  .endArray(hummus.eTokenSeparatorEndLine)
  .endDictionary(parentDict)
  .endIndirectObject();

  return fieldsReferences;
}

/**
 * write fields/kids array of dictionary. make sure all become indirect, for the sake of simplicity,
 * which is why it gets to take care of finishing the writing of the said dict
 */
function writeFilledFields(handles: any, parentDict: any, fields: any, inheritedProperties: any, baseFieldName: any) {
  const fieldsReferences = writeKidsAndEndObject(handles, parentDict, fields);

  // now recreate the fields, filled this time (and down the recursion hole...)
  fieldsReferences.forEach((fieldReference: any) => {
    if (fieldReference.existing) {
      handles.objectsContext.startModifiedIndirectObject(fieldReference.id);
      writeFilledField(handles, handles.reader.parseNewObject(fieldReference.id).toPDFDictionary(), inheritedProperties, baseFieldName);
    } else {
      handles.objectsContext.startNewIndirectObject(fieldReference.id);
      writeFilledField(handles, fieldReference.field.toPDFDictionary(), inheritedProperties, baseFieldName);
    }
  });
}

/**
 * a wonderfully reusable method to recreate a dict without all the keys that we want to change
 * note that it starts writing a dict, but doesn't finish it. your job
 */
function startModifiedDictionary(handles: any, originalDict: any, excludedKeys: any) {
  const originalDictJs = originalDict.toJSObject();
  const newDict = handles.objectsContext.startDictionary();

  Object.getOwnPropertyNames(originalDictJs)
  .forEach((element) => {
    if (!excludedKeys[element]) {
      newDict.writeKey(element);
      handles.copyingContext.copyDirectObjectAsIs(originalDictJs[element]);
    }
  });

  return newDict;
}

/**
 * Write a filled form dictionary, and its subordinate fields.
 * assumes in an indirect object, so will finish it
 */
function writeFilledForm(handles: any, acrobatFormDict: any) {
  const modifiedAcrobatFormDict = startModifiedDictionary(handles, acrobatFormDict, {'Fields': -1});

  const fields = acrobatFormDict.exists('Fields') ?
    handles.reader.queryDictionaryObject(acrobatFormDict, 'Fields').toPDFArray() : null;

  if (fields) {
    modifiedAcrobatFormDict.writeKey('Fields');

    // will also take care of finishing the dictionary and indirect object, so no need to finish after
    writeFilledFields(handles, modifiedAcrobatFormDict, fields, {}, '');
  } else {
    handles
    .objectsContext.endDictionary(modifiedAcrobatFormDict)
    .objectsContext.endIndirectObject();
  }
}

export function fillForm(filePath: string, data: IFillFormData, options?: IFillFormOptions) {

  // create a writer stream to modify the file in place
  const writer = hummus.createWriterToModify(filePath);

  // optionally setup font
  if (options && options.defaultTextOptions) {
    options.defaultTextOptions.font = writer.getFontForFile(options.defaultTextOptions.font);
  }

  // setup parser
  const reader = writer.getModifiedFileParser();

  // start out by finding the acrobat form
  const catalogDict = reader.queryDictionaryObject(reader.getTrailer(), 'Root').toPDFDictionary();

  // get Acrobat Form Object
  const acrobatFormCatalog = catalogDict.exists('AcroForm') ? catalogDict.queryObject('AcroForm') : null;

  if (!acrobatFormCatalog) throw new Error('form not found!');

  // setup copying context, and keep reference to objects context as well
  const copyingContext = writer.createPDFCopyingContextForModifiedFile();
  const objectsContext = writer.getObjectsContext();

  // parse the acrobat form dict
  const acroformDict = catalogDict.exists('AcroForm') ? reader.queryDictionaryObject(catalogDict, 'AcroForm') : null;

  const handles = {
    writer,
    reader,
    copyingContext,
    objectsContext,
    data,
    acroformDict,
    options: options || {}
  };

  // recreate a copy of the existing form, which we will fill with data.
  if (acrobatFormCatalog.getType() === hummus.ePDFObjectIndirectObjectReference) {
    // if the form is a referenced object, modify it
    const acrobatFormObjectId = acrobatFormCatalog.toPDFIndirectObjectReference().getObjectID();
    objectsContext.startModifiedIndirectObject(acrobatFormObjectId);

    writeFilledForm(handles, acroformDict);
  } else {
    // otherwise, recreate the form as an indirect child
    // (this is going to be a general policy,
    // we're making things indirect. it's simpler), and recreate the catalog
    const catalogObjectId = reader.getTrailer().queryObject('Root').toPDFIndirectObjectReference().getObjectID();
    const newAcrobatFormObjectId = objectsContext.allocateNewObjectID();

    // recreate the catalog with form pointing to new reference
    objectsContext.startModifiedIndirectObject(catalogObjectId);
    const modifiedCatalogDictionary = startModifiedDictionary(handles, catalogDict, {'AcroForm': -1});

    modifiedCatalogDictionary.writeKey('AcroForm');
    modifiedCatalogDictionary.writeObjectReferenceValue(newAcrobatFormObjectId);

    objectsContext
    .endDictionary(modifiedCatalogDictionary)
    .endIndirectObject();

    // now create the new form object
    objectsContext.startNewIndirectObject(newAcrobatFormObjectId);

    writeFilledForm(handles, acroformDict);
  }

  writer.end();
}
