# دليل نشر واستضافة نظام أكاديمية دوز وايز (DoseWise Academy) السحابي المجاني

> **ملاحظة تقنية هامة:**  
> استضافة **InfinityFree** مخصصة فقط لمواقع **PHP و MySQL** الثابتة ولا تدعم خوادم بايثون الحية (`FastAPI / Python / Uvicorn`).  
> لذلك، تم تجهيز هذا الدليل بأفضل وأقوى منصات الاستضافة السحابية العالمية المجانية التي تدعم **Python** بالكامل وتمنحك رابطاً مباشراً مشفراً بشهادة أمان SSL مجاناً (مثل: `https://dosewise-academy.onrender.com`).

---

## 🚀 الخيار الأول (الأسهل والأسرع والموصى به): النشر على Render.com (مجاني 100%)

منصة **Render.com** هي الخيار الأمثل والاحترافي لتشغيل تطبيقات **FastAPI / Python**. تم تجهيز المشروع بملف الإعداد التلقائي `render.yaml` و `Procfile` و `Dockerfile`.

### الخطوات (تستغرق 3 دقائق فقط):

#### 1. رفع المشروع إلى حسابك على GitHub:
افتح موجه الأوامر (Terminal أو PowerShell) في مجلد المشروع ونفذ:
```bash
git init
git add .
git commit -m "DoseWise Academy Production Ready"
git branch -M main
```
ثم أنشئ مستودعاً جديداً (New Repository) على حسابك في GitHub (مثلاً باسم `dosewise-academy`) واربطه:
```bash
git remote add origin https://github.com/YOUR_USERNAME/dosewise-academy.git
git push -u origin main
```

#### 2. الربط مع Render.com:
1. اذهب إلى الموقع: [https://render.com](https://render.com) وسجل الدخول مجاناً باستخدام حسابك في **GitHub**.
2. في لوحة التحكم (Dashboard)، اضغط على الزر الأزرق **New +** في الأعلى، ثم اختر **Web Service**.
3. اختر مستودع المشروع `dosewise-academy` من القائمة واضغط **Connect**.
4. سيقرأ Render ملف `render.yaml` و `requirements.txt` تلقائياً، أو تأكد من البيانات التالية:
   - **Name:** `dosewise-academy`
   - **Language / Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. اضغط على **Create Web Service** أسفل الصفحة.

#### 3. مبروك! موقعك الآن متاح عالمياً:
- سيبدأ سيرفر Render بتثبيت الحزم وتشغيل النظام خلال دقيقة إلى دقيقتين.
- سيظهر لك رابط موقعك المباشر في أعلى الصفحة (مثال: `https://dosewise-academy.onrender.com`).
- يمكنك الآن الدخول وتغيير كلمة المرور وبدء إدارة المركز التدريبي فوراً!

---

## 🐍 الخيار الثاني: النشر على PythonAnywhere.com (مجاني)

إذا كنت تفضل منصة **PythonAnywhere**:
1. سجل حساباً مجانياً على [https://www.pythonanywhere.com](https://www.pythonanywhere.com).
2. افتح **Bash Console** في حسابك وقم برفع ملفات المشروع أو سحبها عبر Git:
   ```bash
   git clone https://github.com/YOUR_USERNAME/dosewise-academy.git
   cd dosewise-academy
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. اذهب إلى تبويب **Web** في PythonAnywhere وأنشئ Web App جديد.
4. حدد مسار المشروع ومسار البيئة الافتراضية `venv`.
5. في ملف إعدادات WSGI، استخدم `asgi.py` أو قم بتشغيل الخادم كخدمة ويب دائمة.

---

## 🐳 الخيار الثالث: النشر عبر Docker (Railway / Koyeb / Fly.io)

المشروع مزود بملف `Dockerfile` مدمج وخفيف الوزن (مبني على `python:3.11-slim`).  
يمكنك نشره بضغطة زر واحدة على أي منصة تدعم Docker:
- **Koyeb:** اربط حساب GitHub واختر النشر عبر Dockerfile وسيعمل مباشرة على Free Tier.
- **Railway.app:** اضغط Deploy from GitHub repo وسيكتشف Dockerfile تلقائياً.

---

## 🔐 بيانات الدخول الافتراضية للنظام

عند فتح الموقع لأول مرة، استخدم بيانات الحساب الإداري الرئيسي:
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `Admin@123`
- **الصلاحية:** مدير عام النظام (Super Admin)

حسابات طاقم العمل الأخرى الجاهزة:
| الدور | اسم المستخدم | كلمة المرور |
| :--- | :--- | :--- |
| **مدير المركز (Center Manager)** | `manager` | `Manager@123` |
| **محاسب مالي (Accountant)** | `accountant` | `Account@123` |
| **موظف استقبال (Receptionist)** | `reception` | `Recept@123` |
| **محاضر / مدرب (Trainer)** | `trainer` | `Trainer@123` |

> 💡 **نصيحة أمان:** بمجرد دخولك للموقع، يمكنك الذهاب إلى شاشة **إدارة المستخدمين** وتعديل أسماء المستخدمين وكلمات المرور الخاصة بكم عبر زر **"تعديل"**.

---

## 💾 قاعدة البيانات والنسخ الاحتياطي (Backups)

- قاعدة البيانات المستخدمة هي **SQLite** فائقة السرعة والموثوقية (`WAL Mode`) وموجودة في المسار:
  ```
  data/dosewise.db
  ```
- لأخذ نسخة احتياطية محلية، ما عليك سوى نسخ الملف `dosewise.db` والاحتفاظ به على جهازك بأمان في أي وقت.
