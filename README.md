# Student Activity Analytics Dashboard (Mock Demo)

แดชบอร์ดผู้บริหารเพื่อการวิเคราะห์และติดตามกิจกรรมนิสิต (เวอร์ชันสาธิตข้อมูลจำลอง - Pure Mock Demo) ออกแบบด้วย Next.js 14, React, และ Chart.js สำหรับการแสดงผลแบบ Static Export บน GitHub Pages

---

## 🌟 จุดเด่นของเวอร์ชันนี้
- **100% Client-side Static Export**: ทำงานได้สมบูรณ์โดยไม่ต้องมี Server หรือ Database หลังบ้าน
- **Zero Data Leakage (PDPA Compliant)**:
  - รหัสนิสิตจำลองระบุได้เฉพาะ 2 ตัวหน้า (เช่น 65, 66, 67, 68) เพื่อทดสอบการคำนวณชั้นปี (ปี 1–5+)
  - รายชื่ออาจารย์และผู้รับผิดชอบเป็นนามแฝงทางวิชาการสมมุติ
  - ชื่อโครงการและงบประมาณได้รับการเกลี่ยเป็นตัวเลขจำลอง ไม่เชื่อมโยงกับเอกสารการเงินจริง
- **GitHub Pages Ready**: มาพร้อม GitHub Actions Workflow (`.github/workflows/deploy.yml`) ที่จะ Build และ Deploy ขึ้น GitHub Pages อัตโนมัติเมื่อ Push ขึ้น branch `main`

---

## 🚀 การติดตั้งและรันในเครื่อง (Local Development)

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. รันโหมด Development
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## 📦 การสร้างไฟล์ Static สำหรับนำไป Host

```bash
# สั่ง Build Static Export (ผลลัพธ์จะอยู่ที่โฟลเดอร์ ./out)
npm run build
```

---

## 🌐 การนำขึ้น GitHub Pages

1. สร้าง Public Repository ใหม่บน GitHub (เช่น `student-activity-dashboard`)
2. Push โค้ดขึ้นไปที่ branch `main`:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
3. บนหน้า GitHub Repository:
   - ไปที่แท็บ **Settings** > **Pages**
   - ในส่วน **Build and deployment** > **Source** ให้เลือกเป็น **GitHub Actions**
4. เมื่อ Workflow ทำงานเสร็จสิ้น หน้าเว็บแดชบอร์ดจะเปิดให้เข้าชมผ่าน URL:
   `https://<your-username>.github.io/<your-repo-name>/`
