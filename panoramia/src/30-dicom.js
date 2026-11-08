/* PanoramIA — DICOM reader, whitelist de-identification and frame decoder.
 * Scope (documented in the app): DICOM Part 10 files and bare datasets in
 * Implicit VR Little Endian and Explicit VR Little Endian. Encapsulated
 * (compressed) pixel data and Explicit VR Big Endian are recognised but not
 * decoded. Only the first frame of a multi-frame object is decoded.
 * No external dependencies. Pure functions; safe to unit-test in Node.
 */
(function (root) {
  'use strict';

  var TS = {
    IMPLICIT_LE: '1.2.840.10008.1.2',
    EXPLICIT_LE: '1.2.840.10008.1.2.1',
    DEFLATED_LE: '1.2.840.10008.1.2.1.99',
    EXPLICIT_BE: '1.2.840.10008.1.2.2'
  };

  // VRs that carry a 4-byte length after 2 reserved bytes in explicit VR encoding.
  var LONG_VRS = { OB: 1, OW: 1, OF: 1, OD: 1, OL: 1, OV: 1, SQ: 1, UT: 1, UN: 1, UC: 1, UR: 1, SV: 1, UV: 1 };
  var STRING_VRS = { AE: 1, AS: 1, CS: 1, DA: 1, DS: 1, DT: 1, IS: 1, LO: 1, LT: 1, PN: 1, SH: 1, ST: 1, TM: 1, UI: 1, UT: 1, UC: 1, UR: 1 };

  // Minimal dictionary: tag -> [VR, name, policy]
  // policy: 'keep' (technical, retained), 'derive' (used to derive a coarse value, then discarded), 'remove' (identifying)
  // Any tag not listed is removed. Private tags (odd group) are always removed.
  var DICT = {
    '00020002': ['UI', 'MediaStorageSOPClassUID', 'remove'],
    '00020003': ['UI', 'MediaStorageSOPInstanceUID', 'remove'],
    '00020010': ['UI', 'TransferSyntaxUID', 'keep'],
    '00020012': ['UI', 'ImplementationClassUID', 'remove'],
    '00020013': ['SH', 'ImplementationVersionName', 'remove'],
    '00080005': ['CS', 'SpecificCharacterSet', 'keep'],
    '00080008': ['CS', 'ImageType', 'keep'],
    '00080016': ['UI', 'SOPClassUID', 'keep'],
    '00080018': ['UI', 'SOPInstanceUID', 'remove'],
    '00080020': ['DA', 'StudyDate', 'derive'],
    '00080021': ['DA', 'SeriesDate', 'remove'],
    '00080022': ['DA', 'AcquisitionDate', 'remove'],
    '00080023': ['DA', 'ContentDate', 'remove'],
    '00080030': ['TM', 'StudyTime', 'remove'],
    '00080031': ['TM', 'SeriesTime', 'remove'],
    '00080032': ['TM', 'AcquisitionTime', 'remove'],
    '00080033': ['TM', 'ContentTime', 'remove'],
    '00080050': ['SH', 'AccessionNumber', 'remove'],
    '00080060': ['CS', 'Modality', 'keep'],
    '00080070': ['LO', 'Manufacturer', 'keep'],
    '00080080': ['LO', 'InstitutionName', 'remove'],
    '00080081': ['ST', 'InstitutionAddress', 'remove'],
    '00080090': ['PN', 'ReferringPhysicianName', 'remove'],
    '00081010': ['SH', 'StationName', 'remove'],
    '00081030': ['LO', 'StudyDescription', 'remove'],
    '0008103E': ['LO', 'SeriesDescription', 'remove'],
    '00081040': ['LO', 'InstitutionalDepartmentName', 'remove'],
    '00081048': ['PN', 'PhysiciansOfRecord', 'remove'],
    '00081050': ['PN', 'PerformingPhysicianName', 'remove'],
    '00081060': ['PN', 'NameOfPhysiciansReadingStudy', 'remove'],
    '00081070': ['PN', 'OperatorsName', 'remove'],
    '00081090': ['LO', 'ManufacturerModelName', 'keep'],
    '00081120': ['SQ', 'ReferencedPatientSequence', 'remove'],
    '00100010': ['PN', 'PatientName', 'remove'],
    '00100020': ['LO', 'PatientID', 'remove'],
    '00100021': ['LO', 'IssuerOfPatientID', 'remove'],
    '00100030': ['DA', 'PatientBirthDate', 'derive'],
    '00100032': ['TM', 'PatientBirthTime', 'remove'],
    '00100040': ['CS', 'PatientSex', 'derive'],
    '00100050': ['SQ', 'PatientInsurancePlanCodeSequence', 'remove'],
    '00101000': ['LO', 'OtherPatientIDs', 'remove'],
    '00101001': ['PN', 'OtherPatientNames', 'remove'],
    '00101002': ['SQ', 'OtherPatientIDsSequence', 'remove'],
    '00101005': ['PN', 'PatientBirthName', 'remove'],
    '00101010': ['AS', 'PatientAge', 'derive'],
    '00101020': ['DS', 'PatientSize', 'remove'],
    '00101030': ['DS', 'PatientWeight', 'remove'],
    '00101040': ['LO', 'PatientAddress', 'remove'],
    '00101060': ['PN', 'PatientMotherBirthName', 'remove'],
    '00102150': ['LO', 'CountryOfResidence', 'remove'],
    '00102152': ['LO', 'RegionOfResidence', 'remove'],
    '00102154': ['SH', 'PatientTelephoneNumbers', 'remove'],
    '00102160': ['SH', 'EthnicGroup', 'remove'],
    '00102180': ['SH', 'Occupation', 'remove'],
    '001021B0': ['LT', 'AdditionalPatientHistory', 'remove'],
    '001021F0': ['LO', 'PatientReligiousPreference', 'remove'],
    '00104000': ['LT', 'PatientComments', 'remove'],
    '00180015': ['CS', 'BodyPartExamined', 'keep'],
    '00180060': ['DS', 'KVP', 'keep'],
    '00181000': ['LO', 'DeviceSerialNumber', 'remove'],
    '00181020': ['LO', 'SoftwareVersions', 'keep'],
    '00181150': ['IS', 'ExposureTime', 'keep'],
    '00181151': ['IS', 'XRayTubeCurrent', 'keep'],
    '00181152': ['IS', 'Exposure', 'keep'],
    '00181164': ['DS', 'ImagerPixelSpacing', 'keep'],
    '00185100': ['CS', 'PatientPosition', 'keep'],
    '0020000D': ['UI', 'StudyInstanceUID', 'remove'],
    '0020000E': ['UI', 'SeriesInstanceUID', 'remove'],
    '00200010': ['SH', 'StudyID', 'remove'],
    '00200011': ['IS', 'SeriesNumber', 'remove'],
    '00200013': ['IS', 'InstanceNumber', 'keep'],
    '00200020': ['CS', 'PatientOrientation', 'keep'],
    '00204000': ['LT', 'ImageComments', 'remove'],
    '00280002': ['US', 'SamplesPerPixel', 'keep'],
    '00280004': ['CS', 'PhotometricInterpretation', 'keep'],
    '00280006': ['US', 'PlanarConfiguration', 'keep'],
    '00280008': ['IS', 'NumberOfFrames', 'keep'],
    '00280010': ['US', 'Rows', 'keep'],
    '00280011': ['US', 'Columns', 'keep'],
    '00280030': ['DS', 'PixelSpacing', 'keep'],
    '00280100': ['US', 'BitsAllocated', 'keep'],
    '00280101': ['US', 'BitsStored', 'keep'],
    '00280102': ['US', 'HighBit', 'keep'],
    '00280103': ['US', 'PixelRepresentation', 'keep'],
    '00280301': ['CS', 'BurnedInAnnotation', 'keep'],
    '00281050': ['DS', 'WindowCenter', 'keep'],
    '00281051': ['DS', 'WindowWidth', 'keep'],
    '00281052': ['DS', 'RescaleIntercept', 'keep'],
    '00281053': ['DS', 'RescaleSlope', 'keep'],
    '00281054': ['LO', 'RescaleType', 'keep'],
    '00282110': ['CS', 'LossyImageCompression', 'keep'],
    '00321032': ['PN', 'RequestingPhysician', 'remove'],
    '00321060': ['LO', 'RequestedProcedureDescription', 'remove'],
    '00400275': ['SQ', 'RequestAttributesSequence', 'remove'],
    '7FE00010': ['OW', 'PixelData', 'keep']
  };

  function tagKey(group, element) {
    return (hex4(group) + hex4(element)).toUpperCase();
  }
  function hex4(n) {
    var s = n.toString(16).toUpperCase();
    while (s.length < 4) s = '0' + s;
    return s;
  }
  function tagLabel(key) {
    return '(' + key.slice(0, 4) + ',' + key.slice(4) + ')';
  }

  function isVrChar(c) { return c >= 65 && c <= 90; }

  function readString(u8, pos, len) {
    var end = Math.min(pos + len, u8.length), s = '';
    for (var i = pos; i < end; i++) {
      var c = u8[i];
      if (c === 0) continue;
      s += String.fromCharCode(c);
    }
    return s.replace(/\s+$/, '').replace(/^\s+/, '');
  }

  /** Parse a DICOM byte buffer. Never throws for malformed input; returns {ok:false, error} instead. */
  function parse(buffer) {
    var u8 = new Uint8Array(buffer);
    var dv = new DataView(buffer);
    var len = u8.length;
    var result = {
      ok: false, error: null, hasPreamble: false, transferSyntax: null,
      explicit: true, littleEndian: true, encapsulated: false, unsupportedReason: null,
      elements: [], dataset: {}, pixelData: null
    };
    try {
      var pos = 0;
      if (len > 132 && u8[128] === 0x44 && u8[129] === 0x49 && u8[130] === 0x43 && u8[131] === 0x4D) {
        pos = 132; result.hasPreamble = true;
      } else if (len < 8) {
        result.error = 'too_short'; return result;
      }
      var guard = 0;
      // ---- File meta information (group 0002), always explicit VR little endian ----
      if (result.hasPreamble) {
        while (pos + 8 <= len && guard++ < 10000) {
          var g = dv.getUint16(pos, true);
          if (g !== 0x0002) break;
          var el = readElement(pos, true);
          if (!el) break;
          recordElement(el, 0, false);
          pos = el.nextPos;
        }
      }
      var ts = result.dataset['00020010'] ? String(result.dataset['00020010']) : null;
      result.transferSyntax = ts;
      if (ts === TS.IMPLICIT_LE) { result.explicit = false; }
      else if (ts === TS.EXPLICIT_LE || ts === null) { result.explicit = true; }
      else if (ts === TS.EXPLICIT_BE) { result.unsupportedReason = 'big_endian'; result.littleEndian = false; }
      else if (ts === TS.DEFLATED_LE) { result.unsupportedReason = 'deflated'; }
      else if (ts.indexOf('1.2.840.10008.1.2.4') === 0 || ts === '1.2.840.10008.1.2.5' || ts.indexOf('1.2.840.10008.1.2.6') === 0) {
        result.encapsulated = true; result.explicit = true; // encapsulated syntaxes are explicit VR LE
      } else {
        result.unsupportedReason = 'unknown_transfer_syntax';
      }
      if (ts === null) {
        // No file meta: guess implicit vs explicit from the first element's VR bytes.
        if (pos + 6 <= len && isVrChar(u8[pos + 4]) && isVrChar(u8[pos + 5])) result.explicit = true; else result.explicit = false;
      }
      if (result.unsupportedReason === 'big_endian' || result.unsupportedReason === 'deflated' || result.unsupportedReason === 'unknown_transfer_syntax') {
        result.ok = true; // metadata from file meta is still available
        return result;
      }
      // ---- Main dataset ----
      walk(pos, len, result.explicit, 0, false);
      result.ok = true;
      return result;
    } catch (e) {
      result.error = 'parse_error: ' + (e && e.message ? e.message : String(e));
      return result;
    }

    // Reads one element header at pos. Returns null at end of buffer.
    function readElement(p, explicit) {
      if (p + 8 > len) return null;
      var group = dv.getUint16(p, true), element = dv.getUint16(p + 2, true);
      var key = tagKey(group, element);
      var vr = null, length, valuePos;
      var isDelim = (group === 0xFFFE);
      if (explicit && !isDelim) {
        vr = String.fromCharCode(u8[p + 4], u8[p + 5]);
        if (!(isVrChar(u8[p + 4]) && isVrChar(u8[p + 5]))) {
          // Not a VR: file claims explicit but element is implicit-encoded. Fall back.
          length = dv.getUint32(p + 4, true); valuePos = p + 8; vr = DICT[key] ? DICT[key][0] : 'UN';
        } else if (LONG_VRS[vr]) {
          if (p + 12 > len) return null;
          length = dv.getUint32(p + 8, true); valuePos = p + 12;
        } else {
          length = dv.getUint16(p + 6, true); valuePos = p + 8;
        }
      } else {
        length = dv.getUint32(p + 4, true); valuePos = p + 8;
        vr = isDelim ? null : (DICT[key] ? DICT[key][0] : 'UN');
      }
      var undefinedLength = (length === 0xFFFFFFFF);
      var nextPos = undefinedLength ? null : valuePos + length;
      if (!undefinedLength && nextPos > len) { nextPos = len; length = len - valuePos; }
      return { group: group, element: element, key: key, vr: vr, length: length, valuePos: valuePos, nextPos: nextPos, undefinedLength: undefinedLength };
    }

    function recordElement(el, depth, inSequence) {
      var entry = DICT[el.key];
      result.elements.push({
        key: el.key, tag: tagLabel(el.key), vr: el.vr, length: el.length, depth: depth, inSequence: inSequence,
        name: entry ? entry[1] : (el.group % 2 === 1 ? 'PrivateTag' : 'Unknown'),
        isPrivate: el.group % 2 === 1
      });
      if (depth === 0 && !el.undefinedLength && el.key !== '7FE00010' && el.vr !== 'SQ') {
        result.dataset[el.key] = decodeValue(el);
      }
    }

    function decodeValue(el) {
      var vr = el.vr, p = el.valuePos, l = el.length;
      if (l === 0) return '';
      if (STRING_VRS[vr]) {
        var s = readString(u8, p, l);
        if (vr === 'DS' || vr === 'IS') {
          var parts = s.split('\\').map(function (x) { return parseFloat(x); });
          return parts.length === 1 ? parts[0] : parts;
        }
        return s;
      }
      var n, arr, i;
      if (vr === 'US') { n = Math.floor(l / 2); if (n === 1) return dv.getUint16(p, true); arr = []; for (i = 0; i < n; i++) arr.push(dv.getUint16(p + 2 * i, true)); return arr; }
      if (vr === 'SS') { n = Math.floor(l / 2); if (n === 1) return dv.getInt16(p, true); arr = []; for (i = 0; i < n; i++) arr.push(dv.getInt16(p + 2 * i, true)); return arr; }
      if (vr === 'UL') { n = Math.floor(l / 4); if (n === 1) return dv.getUint32(p, true); arr = []; for (i = 0; i < n; i++) arr.push(dv.getUint32(p + 4 * i, true)); return arr; }
      if (vr === 'SL') { n = Math.floor(l / 4); if (n === 1) return dv.getInt32(p, true); arr = []; for (i = 0; i < n; i++) arr.push(dv.getInt32(p + 4 * i, true)); return arr; }
      if (vr === 'FL') { n = Math.floor(l / 4); if (n === 1) return dv.getFloat32(p, true); arr = []; for (i = 0; i < n; i++) arr.push(dv.getFloat32(p + 4 * i, true)); return arr; }
      if (vr === 'FD') { n = Math.floor(l / 8); if (n === 1) return dv.getFloat64(p, true); arr = []; for (i = 0; i < n; i++) arr.push(dv.getFloat64(p + 8 * i, true)); return arr; }
      if (vr === 'AT') { return tagKey(dv.getUint16(p, true), dv.getUint16(p + 2, true)); }
      return null; // binary (OB/OW/UN...) not decoded here
    }

    // Walks elements in [start, end). Returns the position after the last element consumed.
    function walk(start, end, explicit, depth, inSequence) {
      var p = start, g2 = 0;
      while (p + 8 <= end && g2++ < 2000000) {
        var el = readElement(p, explicit);
        if (!el) break;
        if (el.group === 0xFFFE && el.element === 0xE00D) { return el.valuePos; } // item delimiter
        if (el.group === 0xFFFE && el.element === 0xE0DD) { return el.valuePos; } // sequence delimiter
        if (el.group === 0xFFFE && el.element === 0xE000) {
          // Stray item at dataset level (should not happen); skip its content.
          p = el.undefinedLength ? walk(el.valuePos, end, explicit, depth, inSequence) : el.nextPos; continue;
        }
        recordElement(el, depth, inSequence);
        if (el.key === '7FE00010') {
          result.pixelData = { valuePos: el.valuePos, length: el.length, undefinedLength: el.undefinedLength, vr: el.vr };
          if (el.undefinedLength) {
            p = skipEncapsulated(el.valuePos, end);
          } else {
            p = el.nextPos;
          }
          continue;
        }
        if (el.vr === 'SQ' || (el.vr === 'UN' && el.undefinedLength)) {
          var innerExplicit = (el.vr === 'UN') ? false : explicit;
          if (el.undefinedLength) {
            p = walkItems(el.valuePos, end, innerExplicit, depth + 1);
          } else {
            walkItems(el.valuePos, el.nextPos, innerExplicit, depth + 1);
            p = el.nextPos;
          }
          continue;
        }
        if (el.undefinedLength) {
          // Undefined length on a non-SQ element: treat like a sequence of items to stay in sync.
          p = walkItems(el.valuePos, end, explicit, depth + 1);
          continue;
        }
        p = el.nextPos;
      }
      return p;
    }

    // Walks sequence items from start until end or a sequence delimiter. Returns position after the delimiter / end.
    function walkItems(start, end, explicit, depth) {
      var p = start, g3 = 0;
      while (p + 8 <= end && g3++ < 2000000) {
        var group = dv.getUint16(p, true), element = dv.getUint16(p + 2, true);
        var length = dv.getUint32(p + 4, true);
        if (group === 0xFFFE && element === 0xE0DD) { return p + 8; }
        if (group === 0xFFFE && element === 0xE000) {
          var itemStart = p + 8;
          if (length === 0xFFFFFFFF) {
            p = walk(itemStart, end, explicit, depth, true);
          } else {
            var itemEnd = Math.min(itemStart + length, end);
            walk(itemStart, itemEnd, explicit, depth, true);
            p = itemEnd;
          }
          continue;
        }
        // Unexpected content: try to parse as an element to resync.
        var el = readElement(p, explicit);
        if (!el || el.nextPos === null) break;
        recordElement(el, depth, true);
        p = el.nextPos;
      }
      return p;
    }

    // Encapsulated pixel data: fragments are raw bytes, never parsed as datasets.
    function skipEncapsulated(start, end) {
      var p = start, g4 = 0;
      while (p + 8 <= end && g4++ < 100000) {
        var group = dv.getUint16(p, true), element = dv.getUint16(p + 2, true);
        var length = dv.getUint32(p + 4, true);
        if (group === 0xFFFE && element === 0xE0DD) return p + 8;
        if (group === 0xFFFE && element === 0xE000) { p = p + 8 + (length === 0xFFFFFFFF ? 0 : length); continue; }
        break;
      }
      return end;
    }
  }

  function ageBandFromYears(y) {
    if (y === null || y === undefined || isNaN(y) || y < 0) return null;
    if (y < 12) return '0-11';
    if (y < 18) return '12-17';
    if (y < 30) return '18-29';
    if (y < 45) return '30-44';
    if (y < 60) return '45-59';
    if (y < 75) return '60-74';
    return '75+';
  }

  function parseDA(s) {
    if (!s || typeof s !== 'string') return null;
    var m = s.replace(/[^0-9]/g, '');
    if (m.length < 8) return null;
    var y = parseInt(m.slice(0, 4), 10), mo = parseInt(m.slice(4, 6), 10), d = parseInt(m.slice(6, 8), 10);
    if (!(y > 1800 && y < 2200) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y: y, m: mo, d: d };
  }

  function ageFromAS(s) {
    if (!s || typeof s !== 'string') return null;
    var m = /^(\d{1,3})([DWMY])$/.exec(s.trim().toUpperCase());
    if (!m) return null;
    var n = parseInt(m[1], 10);
    if (m[2] === 'Y') return n;
    if (m[2] === 'M') return Math.floor(n / 12);
    if (m[2] === 'W') return Math.floor(n / 52);
    return Math.floor(n / 365);
  }

  function ageBetween(birth, study) {
    var a = study.y - birth.y;
    if (study.m < birth.m || (study.m === birth.m && study.d < birth.d)) a -= 1;
    return a;
  }

  /** Whitelist de-identification. Returns only technical fields plus coarse derived values; produces a receipt. */
  function deidentify(parsed) {
    var ds = parsed.dataset || {};
    var kept = {}, derived = {}, receipt = [], seen = {};
    var counts = { kept: 0, derived: 0, removed: 0, privateRemoved: 0, inSequenceRemoved: 0 };
    for (var i = 0; i < parsed.elements.length; i++) {
      var e = parsed.elements[i];
      var entry = DICT[e.key];
      var policy = entry ? entry[2] : 'remove';
      if (e.inSequence) policy = 'remove'; // nothing inside sequences is carried forward
      if (e.isPrivate) policy = 'remove';
      if (e.key === '7FE00010' && !e.inSequence) policy = 'keep';
      var action = policy;
      if (policy === 'keep' && !e.inSequence) { kept[e.key] = ds[e.key]; counts.kept++; }
      else if (policy === 'derive') { counts.derived++; }
      else { counts.removed++; if (e.isPrivate) counts.privateRemoved++; if (e.inSequence) counts.inSequenceRemoved++; }
      var rk = e.key + (e.inSequence ? ':seq' : '');
      if (!seen[rk]) {
        seen[rk] = true;
        receipt.push({ tag: e.tag, name: e.name + (e.inSequence ? ' (in sequence)' : ''), action: action, isPrivate: e.isPrivate });
      }
    }
    // Derived coarse values (dates never retained)
    var study = parseDA(ds['00080020']);
    derived.year = study ? study.y : null;
    var sex = (ds['00100040'] || '').toString().toUpperCase();
    derived.sex = sex === 'F' ? 'F' : sex === 'M' ? 'M' : sex === 'O' ? 'O' : 'U';
    var years = ageFromAS(ds['00101010']);
    if (years === null) {
      var birth = parseDA(ds['00100030']);
      if (birth && study) years = ageBetween(birth, study);
    }
    derived.ageBand = ageBandFromYears(years);
    derived.modality = ds['00080060'] || null;
    derived.manufacturer = ds['00080070'] || null;
    derived.model = ds['00081090'] || null;
    derived.burnedInDeclared = ((ds['00280301'] || '') + '').toUpperCase() === 'YES';
    derived.rows = ds['00280010'] || null;
    derived.columns = ds['00280011'] || null;
    derived.frames = ds['00280008'] ? parseInt(ds['00280008'], 10) : 1;
    derived.bitsAllocated = ds['00280100'] || null;
    derived.photometric = ds['00280004'] || null;
    derived.pixelSpacing = ds['00280030'] || ds['00181164'] || null;
    derived.transferSyntax = parsed.transferSyntax;
    derived.encapsulated = !!parsed.encapsulated;
    return { kept: kept, derived: derived, receipt: receipt, counts: counts };
  }

  function clamp8(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  /** Decode one frame into RGBA. Returns {ok:false, reason} when unsupported. */
  function decodeFrame(parsed, buffer, opts) {
    opts = opts || {};
    var ds = parsed.dataset || {};
    if (!parsed.pixelData) return { ok: false, reason: 'no_pixel_data' };
    if (parsed.encapsulated || parsed.pixelData.undefinedLength) return { ok: false, reason: 'compressed' };
    if (parsed.unsupportedReason) return { ok: false, reason: parsed.unsupportedReason };
    var rows = ds['00280010'], cols = ds['00280011'];
    var bitsAllocated = ds['00280100'] || 8, bitsStored = ds['00280101'] || bitsAllocated;
    var pixelRep = ds['00280103'] || 0, spp = ds['00280002'] || 1;
    var photometric = (ds['00280004'] || 'MONOCHROME2').toString().toUpperCase();
    var planar = ds['00280006'] || 0;
    var frames = ds['00280008'] ? parseInt(ds['00280008'], 10) : 1;
    var frame = opts.frame || 0;
    if (!(rows > 0 && cols > 0)) return { ok: false, reason: 'bad_dimensions' };
    if (rows * cols > 60000000) return { ok: false, reason: 'too_large' };
    var bytesPerSample = bitsAllocated / 8;
    if (bytesPerSample !== 1 && bytesPerSample !== 2) return { ok: false, reason: 'unsupported_bits' };
    var frameSize = rows * cols * spp * bytesPerSample;
    var offset = parsed.pixelData.valuePos + frame * frameSize;
    if (frame < 0 || frame >= frames) return { ok: false, reason: 'bad_frame' };
    if (offset + frameSize > buffer.byteLength || offset + frameSize > parsed.pixelData.valuePos + parsed.pixelData.length + 1) {
      return { ok: false, reason: 'truncated_pixel_data' };
    }
    var n = rows * cols;
    var rgba = new Uint8ClampedArray(n * 4);
    var i, v;
    if (spp === 3 && bytesPerSample === 1) {
      var src = new Uint8Array(buffer, offset, n * 3);
      if (photometric !== 'RGB') return { ok: false, reason: 'unsupported_photometric:' + photometric };
      if (planar === 1) {
        for (i = 0; i < n; i++) { rgba[i * 4] = src[i]; rgba[i * 4 + 1] = src[n + i]; rgba[i * 4 + 2] = src[2 * n + i]; rgba[i * 4 + 3] = 255; }
      } else {
        for (i = 0; i < n; i++) { rgba[i * 4] = src[i * 3]; rgba[i * 4 + 1] = src[i * 3 + 1]; rgba[i * 4 + 2] = src[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
      }
      return { ok: true, width: cols, height: rows, rgba: rgba, photometric: photometric, samples: 3, frames: frames, window: null, stats: null };
    }
    if (spp !== 1) return { ok: false, reason: 'unsupported_samples:' + spp };
    if (photometric !== 'MONOCHROME1' && photometric !== 'MONOCHROME2') return { ok: false, reason: 'unsupported_photometric:' + photometric };
    var slope = parseFloat(Array.isArray(ds['00281053']) ? ds['00281053'][0] : ds['00281053']);
    var intercept = parseFloat(Array.isArray(ds['00281052']) ? ds['00281052'][0] : ds['00281052']);
    if (isNaN(slope) || slope === 0) slope = 1;
    if (isNaN(intercept)) intercept = 0;
    // Read raw samples into a Float64 array of rescaled values (simple and exact for our sizes).
    var vals = new Float64Array(n);
    var min = Infinity, max = -Infinity;
    var mask = bitsStored >= 16 ? 0xFFFF : ((1 << bitsStored) - 1);
    var signBit = 1 << (bitsStored - 1);
    if (bytesPerSample === 1) {
      var s8 = new Uint8Array(buffer, offset, n);
      for (i = 0; i < n; i++) {
        v = s8[i] & mask;
        if (pixelRep === 1 && (v & signBit)) v = v - (1 << bitsStored);
        v = v * slope + intercept; vals[i] = v; if (v < min) min = v; if (v > max) max = v;
      }
    } else {
      var copy = buffer.slice(offset, offset + n * 2); // aligned copy
      var s16 = new Uint16Array(copy);
      for (i = 0; i < n; i++) {
        v = s16[i] & mask;
        if (pixelRep === 1 && (v & signBit)) v = v - (1 << bitsStored);
        v = v * slope + intercept; vals[i] = v; if (v < min) min = v; if (v > max) max = v;
      }
    }
    var wc = opts.windowCenter, ww = opts.windowWidth;
    var tagWC = Array.isArray(ds['00281050']) ? ds['00281050'][0] : ds['00281050'];
    var tagWW = Array.isArray(ds['00281051']) ? ds['00281051'][0] : ds['00281051'];
    if (wc === undefined || wc === null || ww === undefined || ww === null) {
      if (tagWC !== undefined && tagWW !== undefined && !isNaN(parseFloat(tagWC)) && !isNaN(parseFloat(tagWW)) && parseFloat(tagWW) > 0) {
        wc = parseFloat(tagWC); ww = parseFloat(tagWW);
      } else {
        wc = (min + max) / 2; ww = (max - min) || 1;
      }
    }
    if (ww < 1) ww = 1;
    var lo = wc - 0.5 - (ww - 1) / 2, hi = wc - 0.5 + (ww - 1) / 2;
    var invert = (photometric === 'MONOCHROME1');
    for (i = 0; i < n; i++) {
      var x = vals[i], y;
      if (x <= lo) y = 0; else if (x > hi) y = 255; else y = ((x - (wc - 0.5)) / (ww - 1) + 0.5) * 255;
      y = clamp8(Math.round(y));
      if (invert) y = 255 - y;
      rgba[i * 4] = y; rgba[i * 4 + 1] = y; rgba[i * 4 + 2] = y; rgba[i * 4 + 3] = 255;
    }
    return { ok: true, width: cols, height: rows, rgba: rgba, photometric: photometric, samples: 1, frames: frames,
      window: { center: wc, width: ww }, stats: { min: min, max: max }, bitsAllocated: bitsAllocated, bitsStored: bitsStored, pixelRep: pixelRep };
  }

  var api = { parse: parse, deidentify: deidentify, decodeFrame: decodeFrame, DICT: DICT, TS: TS, ageBandFromYears: ageBandFromYears, _internal: { parseDA: parseDA, ageFromAS: ageFromAS, ageBetween: ageBetween } };
  root.PX_DICOM = api;
})(typeof window !== 'undefined' ? window : globalThis);
