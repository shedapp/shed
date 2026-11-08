#!/usr/bin/env python3
"""Generate synthetic DICOM test files (no pydicom needed). Values are fictional."""
import struct, os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'testdata')
os.makedirs(OUT, exist_ok=True)

LONG_VRS = {'OB','OW','OF','OD','OL','OV','SQ','UT','UN','UC','UR','SV','UV'}

def pad(b, even_char=b' '):
    return b + even_char if len(b) % 2 else b

def el_explicit(group, elem, vr, value):
    if isinstance(value, str):
        value = value.encode('latin-1')
    value = pad(value, b'\x00' if vr in ('UI','OB','UN') else b' ')
    if vr in LONG_VRS:
        return struct.pack('<HH2sHI', group, elem, vr.encode(), 0, len(value)) + value
    return struct.pack('<HH2sH', group, elem, vr.encode(), len(value)) + value

def el_implicit(group, elem, value, vr_hint='LO'):
    if isinstance(value, str):
        value = value.encode('latin-1')
    value = pad(value, b'\x00' if vr_hint in ('UI','OB','UN') else b' ')
    return struct.pack('<HHI', group, elem, len(value)) + value

def us(v): return struct.pack('<H', v)

def meta(ts):
    body = el_explicit(0x0002,0x0002,'UI','1.2.840.10008.5.1.4.1.1.1.3')
    body += el_explicit(0x0002,0x0003,'UI','1.2.826.0.1.3680043.9999.1.2.3')
    body += el_explicit(0x0002,0x0010,'UI',ts)
    body += el_explicit(0x0002,0x0012,'UI','1.2.826.0.1.3680043.9999.9')
    group_len = el_explicit(0x0002,0x0000,'UL',struct.pack('<I', len(body)))
    return b'\x00'*128 + b'DICM' + group_len + body

def item_defined(content):
    return struct.pack('<HHI', 0xFFFE, 0xE000, len(content)) + content

def item_undefined(content):
    return struct.pack('<HHI', 0xFFFE, 0xE000, 0xFFFFFFFF) + content + struct.pack('<HHI', 0xFFFE, 0xE00D, 0)

def seq_defined(group, elem, items, explicit=True):
    content = b''.join(items)
    if explicit:
        return struct.pack('<HH2sHI', group, elem, b'SQ', 0, len(content)) + content
    return struct.pack('<HHI', group, elem, len(content)) + content

def seq_undefined(group, elem, items, explicit=True):
    content = b''.join(items) + struct.pack('<HHI', 0xFFFE, 0xE0DD, 0)
    if explicit:
        return struct.pack('<HH2sHI', group, elem, b'SQ', 0, 0xFFFFFFFF) + content
    return struct.pack('<HHI', group, elem, 0xFFFFFFFF) + content

def common_patient_explicit():
    b = b''
    b += el_explicit(0x0008,0x0020,'DA','20240310')
    b += el_explicit(0x0008,0x0060,'CS','PX')
    b += el_explicit(0x0008,0x0070,'LO','TestCo')
    b += el_explicit(0x0008,0x0080,'LO','Hospital Ficticio')
    b += el_explicit(0x0008,0x0090,'PN','REFERRING^DOC')
    b += el_explicit(0x0008,0x1090,'LO','Phantom 1')
    # defined-length sequence with an item that contains a patient name
    b += seq_defined(0x0008,0x1120,[item_defined(el_explicit(0x0010,0x0010,'PN','INSEQ^NAME'))])
    b += el_explicit(0x0010,0x0010,'PN','DOE^JANE')
    b += el_explicit(0x0010,0x0020,'LO','12345')
    b += el_explicit(0x0010,0x0030,'DA','19800115')
    b += el_explicit(0x0010,0x0040,'CS','F')
    # undefined-length sequence with undefined-length item containing an ID
    b += seq_undefined(0x0010,0x1002,[item_undefined(el_explicit(0x0010,0x0020,'LO','OTHER-ID-1'))])
    b += el_explicit(0x0009,0x0010,'LO','PRIVATE CREATOR')
    b += el_explicit(0x0009,0x1001,'LO','private value')
    return b

def pixel_desc_explicit(rows, cols, bits_alloc, bits_stored, high_bit, pixel_rep, spp=1, photometric='MONOCHROME2', planar=None, extra=b''):
    b = b''
    b += el_explicit(0x0028,0x0002,'US',us(spp))
    b += el_explicit(0x0028,0x0004,'CS',photometric)
    if planar is not None:
        b += el_explicit(0x0028,0x0006,'US',us(planar))
    b += el_explicit(0x0028,0x0010,'US',us(rows))
    b += el_explicit(0x0028,0x0011,'US',us(cols))
    b += el_explicit(0x0028,0x0100,'US',us(bits_alloc))
    b += el_explicit(0x0028,0x0101,'US',us(bits_stored))
    b += el_explicit(0x0028,0x0102,'US',us(high_bit))
    b += el_explicit(0x0028,0x0103,'US',us(pixel_rep))
    b += extra
    return b

def write(name, data):
    p = os.path.join(OUT, name)
    with open(p, 'wb') as f:
        f.write(data)
    print('wrote', p, len(data), 'bytes')

# 1. Explicit VR LE, 8-bit MONOCHROME2 gradient, burned-in annotation YES
rows, cols = 32, 48
pix = bytes([min(255, x*5) for y in range(rows) for x in range(cols)])
d = meta('1.2.840.10008.1.2.1')
d += common_patient_explicit()
d += pixel_desc_explicit(rows, cols, 8, 8, 7, 0, extra=el_explicit(0x0028,0x0301,'CS','YES'))
d += el_explicit(0x7FE0,0x0010,'OB',pix)
write('explicit_mono2_8bit.dcm', d)

# 2. Implicit VR LE, 16-bit signed ramp -500..500, window 0/1000, PatientAge 034Y
rows, cols = 16, 64
vals = [int(-500 + (1000*x)/(cols-1)) for y in range(rows) for x in range(cols)]
pix = b''.join(struct.pack('<h', v) for v in vals)
d = meta('1.2.840.10008.1.2')
d += el_implicit(0x0008,0x0020,'20230101')
d += el_implicit(0x0008,0x0060,'PX')
d += el_implicit(0x0010,0x0010,'ROE^RICHARD')
d += el_implicit(0x0010,0x0040,'M')
d += el_implicit(0x0010,0x1010,'034Y')
d += el_implicit(0x0028,0x0002,us(1))
d += el_implicit(0x0028,0x0004,'MONOCHROME2')
d += el_implicit(0x0028,0x0010,us(rows))
d += el_implicit(0x0028,0x0011,us(cols))
d += el_implicit(0x0028,0x0100,us(16))
d += el_implicit(0x0028,0x0101,us(16))
d += el_implicit(0x0028,0x0102,us(15))
d += el_implicit(0x0028,0x0103,us(1))
d += el_implicit(0x0028,0x1050,'0')
d += el_implicit(0x0028,0x1051,'1000')
d += el_implicit(0x0028,0x1052,'0')
d += el_implicit(0x0028,0x1053,'1')
# implicit-encoded sequence with undefined length containing a PN
d += seq_undefined(0x0008,0x1120,[item_undefined(el_implicit(0x0010,0x0010,'INSEQ^NAME'))], explicit=False)
d += el_implicit(0x7FE0,0x0010,pix,'OB')
write('implicit_mono2_16bit_signed.dcm', d)

# 3. MONOCHROME1 8-bit constant 0 -> should render white (255)
rows, cols = 8, 8
d = meta('1.2.840.10008.1.2.1')
d += el_explicit(0x0008,0x0060,'CS','IO')
d += pixel_desc_explicit(rows, cols, 8, 8, 7, 0, photometric='MONOCHROME1')
d += el_explicit(0x7FE0,0x0010,'OB',bytes([0]*rows*cols))
write('mono1_8bit.dcm', d)

# 4. RGB 8-bit, planar 0, first pixel red, second green
rows, cols = 4, 4
px = bytearray()
for i in range(rows*cols):
    if i == 0: px += bytes([255,0,0])
    elif i == 1: px += bytes([0,255,0])
    else: px += bytes([10,20,30])
d = meta('1.2.840.10008.1.2.1')
d += el_explicit(0x0008,0x0060,'CS','XC')
d += pixel_desc_explicit(rows, cols, 8, 8, 7, 0, spp=3, photometric='RGB', planar=0)
d += el_explicit(0x7FE0,0x0010,'OB',bytes(px))
write('rgb_8bit.dcm', d)

# 5. Encapsulated (JPEG baseline) with fake fragments -> metadata only
d = meta('1.2.840.10008.1.2.4.50')
d += el_explicit(0x0008,0x0060,'CS','PX')
d += el_explicit(0x0010,0x0010,'PN','ENC^PATIENT')
d += pixel_desc_explicit(10, 10, 8, 8, 7, 0)
frag = bytes([0xFF,0xD8,0xFF,0xD9,0,0])
pd = struct.pack('<HH2sHI', 0x7FE0, 0x0010, b'OB', 0, 0xFFFFFFFF)
pd += struct.pack('<HHI', 0xFFFE, 0xE000, 0)  # basic offset table, empty
pd += struct.pack('<HHI', 0xFFFE, 0xE000, len(frag)) + frag
pd += struct.pack('<HHI', 0xFFFE, 0xE0DD, 0)
d += pd
d += el_explicit(0x0028,0x2110,'CS','01')  # element after pixel data to test resync
write('encapsulated_jpeg.dcm', d)

# 6. Explicit big endian -> unsupported
d = meta('1.2.840.10008.1.2.2')
d += struct.pack('>HH2sH', 0x0008, 0x0060, b'CS', 2) + b'PX'
write('bigendian.dcm', d)

# 7. Bare implicit dataset (no preamble), 8-bit
rows, cols = 4, 6
d = b''
d += el_implicit(0x0008,0x0060,'PX')
d += el_implicit(0x0010,0x0010,'BARE^CASE')
d += el_implicit(0x0028,0x0002,us(1))
d += el_implicit(0x0028,0x0004,'MONOCHROME2')
d += el_implicit(0x0028,0x0010,us(rows))
d += el_implicit(0x0028,0x0011,us(cols))
d += el_implicit(0x0028,0x0100,us(8))
d += el_implicit(0x0028,0x0101,us(8))
d += el_implicit(0x0028,0x0102,us(7))
d += el_implicit(0x0028,0x0103,us(0))
d += el_implicit(0x7FE0,0x0010,bytes([i*10 for i in range(rows*cols)]),'OB')
write('bare_implicit.dcm', d)

# 8. 16-bit unsigned, 12 bits stored, high nibble polluted
rows, cols = 2, 8
vals = [0, 100, 1000, 2000, 3000, 4000, 4095, 4095, 0, 0, 0, 0, 0, 0, 0, 0]
polluted = [v | 0xF000 if i % 2 == 1 else v for i, v in enumerate(vals)]
pix = b''.join(struct.pack('<H', v) for v in polluted)
d = meta('1.2.840.10008.1.2.1')
d += el_explicit(0x0008,0x0060,'CS','PX')
d += pixel_desc_explicit(rows, cols, 16, 12, 11, 0)
d += el_explicit(0x7FE0,0x0010,'OW',pix)
write('u16_12stored.dcm', d)

# 9. Truncated pixel data
d = meta('1.2.840.10008.1.2.1')
d += el_explicit(0x0008,0x0060,'CS','PX')
d += pixel_desc_explicit(100, 100, 8, 8, 7, 0)
d += struct.pack('<HH2sHI', 0x7FE0, 0x0010, b'OB', 0, 10000) + bytes(50)
write('truncated.dcm', d)
print('done')
