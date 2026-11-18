import zipfile,re,sys,json
src,dst,wout=sys.argv[1:4]
# argv[4] (ถ้ามี) = ไฟล์ JSON ผังช่อง {ย่อหน้า: [[key,[run idx]],...]} สำหรับแบบฟอร์มรุ่นใหม่ (เช่น tools/contract_fields_v2.json)
zin=zipfile.ZipFile(src)
x=zin.read('word/document.xml').decode('utf-8')
# field defs: para k -> list of (key, [run idx])  ; key starting with x_ = checkbox (single sym run)
F={
 9:[('no_a',[2,3,4]),('no_b',[6,7,8]),('no_c',[10,11,12])],
 11:[('sign_date',[6,7]),('start_date',[12,13,14]),('end_date',[16,17,18]),('office',[57,58,59,60,61,62])],
 13:[('corp_name',[2,3,4,5,6]),('corp_reg_no',[10,11]),('corp_reg_at',[15]),('corp_no',[20,21]),('corp_building',[23]),
     ('corp_road',[25,26,27]),('corp_subdistrict',[33]),('corp_district',[37]),('corp_province',[39,40,41,42,43,44,45]),
     ('corp_signer',[49,50,51,52,53]),('corp_cert_date',[59,60]),('corp_poa_date',[64,65,66])],
 14:[('person_name',[2,3,4,5,6]),('person_no',[12,13]),('person_building',[15]),('person_road',[21,22,23,24,25]),
     ('person_subdistrict',[29]),('person_district',[33]),('person_province',[37,38,39,40,41,42,43])],
 64:[('cod_pct',[11,12])],
 69:[('min_qty',[3,4,5,6])],
 70:[('goods_type',[3,4,5,6,7,8,9])],
 71:[('x_label_yes',[3]),('label_detail',[8,9,10,11]),('x_label_no',[13])],
 72:[('x_capos',[2]),('x_pickup',[5]),('x_dropoff',[8]),('x_other',[11]),('other_detail',[16,17,18,19,20,21,22])],
 94:[('contact_name',[3,4,5,6]),('contact_tel',[8,9,10])],
 95:[('contact_email',[1,2,3,4,5]),('post_family',[8,9,10])],
 96:[('wallet_tel',[2,3,4,5,6]),('wallet_name',[9,10,11,12,13,14,15])],
 103:[('thp_signer',[10]),('cus_signer',[16])],
 104:[('thp_position',[1]),('cus_position',[5])],
 106:[('wit1_name',[10]),('wit2_name',[16])],
 107:[('wit1_position',[1]),('wit2_position',[5,6,7])],
}
if len(sys.argv)>4:
    F={int(k):[(a,b) for a,b in v] for k,v in json.load(open(sys.argv[4],encoding='utf-8')).items()}
paras=[m for m in re.finditer(r'<w:p[ >].*?</w:p>',x,re.S) if re.sub(r'<[^>]+>','',m.group(0)).strip() or 'w:sym' in m.group(0)]
widths={}
repl=[]  # (start,end,newxml)
def runtext(r): return ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>',r))
for k,defs in F.items():
    pm=paras[k]; p=pm.group(0)
    runs=list(re.finditer(r'<w:r[ >].*?</w:r>',p,re.S))
    new={}  # run idx -> replacement xml
    for key,idx in defs:
        if key.startswith('x_'):
            r=runs[idx[0]].group(0); assert 'w:sym' in r,(k,key)
            new[idx[0]]=re.sub(r'<w:sym [^>]*/>','<w:t>{{%s}}</w:t>'%key,r)
            continue
        txt=''.join(runtext(runs[i].group(0)) for i in idx)
        assert txt.strip()=='' ,(k,key,repr(txt))
        widths[key]=len(txt)
        r=runs[idx[0]].group(0)
        r2=re.sub(r'<w:t[^>]*>[^<]*</w:t>','',r)
        r2=r2.replace('</w:r>','<w:t xml:space="preserve">{{%s}}</w:t></w:r>'%key)
        new[idx[0]]=r2
        for i in idx[1:]: new[i]=''
    out=[];pos=0
    for i,rm in enumerate(runs):
        out.append(p[pos:rm.start()]); out.append(new.get(i,rm.group(0))); pos=rm.end()
    out.append(p[pos:])
    repl.append((pm.start(),pm.end(),''.join(out)))
# price cells
n=0
for t in re.finditer(r'<w:tbl>.*?</w:tbl>',x,re.S):
    tb=t.group(0)
    if 'กิโลกรัม' not in tb: continue
    rows=list(re.finditer(r'<w:tr[ >].*?</w:tr>',tb,re.S))[1:]
    for rm in rows:
        n+=1
        cells=list(re.finditer(r'<w:tc>.*?</w:tc>',rm.group(0),re.S))
        c=cells[-1].group(0); assert re.sub(r'<[^>]+>','',c).strip()==''
        rpr=re.search(r'<w:pPr>.*?(<w:rPr>.*?</w:rPr>)</w:pPr>',c,re.S).group(1)
        c2=c.replace('</w:pPr></w:p>','</w:pPr><w:r>%s<w:t>{{p%d}}</w:t></w:r></w:p>'%(rpr,n))
        assert c2!=c
        s=t.start()+rm.start()+cells[-1].start()
        repl.append((s,s+len(c),c2))
assert n==30,n
for s,e,new in sorted(repl,reverse=True): x=x[:s]+new+x[e:]
zout=zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    zout.writestr(it, x.encode('utf-8') if it.filename=='word/document.xml' else zin.read(it.filename))
zout.close()
json.dump(widths,open(wout,'w'),ensure_ascii=False)
print('ok fields',len(widths),'prices',n)
