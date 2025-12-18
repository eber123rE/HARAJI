const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname);
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'products.json');

async function ensureStorage(){
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try{
    await fs.access(DATA_FILE);
  }catch(e){
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, Date.now() + '_' + uuidv4() + ext);
  }
});
const upload = multer({ storage, limits: { files: 20, fileSize: 10 * 1024 * 1024 } }); // 10MB per file max

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploaded images
app.use('/uploads', express.static(UPLOAD_DIR));
// serve frontend files from project dir
app.use(express.static(PUBLIC_DIR));

// API: list products
app.get('/api/products', async (req, res) => {
  try{
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const products = JSON.parse(raw || '[]');
    res.json(products);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'failed to read products' });
  }
});

// API: create product
app.post('/api/products', upload.array('images', 20), async (req, res) => {
  try{
    const files = req.files || [];
    if(files.length < 3) return res.status(400).json({ error: 'min 3 images required' });
    if(files.length > 20) return res.status(400).json({ error: 'max 20 images allowed' });

    const { description, phone, address } = req.body;
    if(!description || !phone || !address) return res.status(400).json({ error: 'missing fields' });

    const images = files.map(f => '/uploads/' + path.basename(f.path));
    const product = {
      id: 'p_' + Date.now(),
      description: description.trim(),
      phone: phone.trim(),
      address: address.trim(),
      images,
      created: new Date().toISOString()
    };

    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const arr = JSON.parse(raw || '[]');
    arr.unshift(product);
    await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), 'utf8');

    res.json(product);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'failed to save product' });
  }
});

// start server
ensureStorage().then(()=>{
  app.listen(PORT, ()=>{
    console.log(`Haraji server running at http://localhost:${PORT}`);
  });
}).catch(err=>{
  console.error('failed to prepare storage', err);
  process.exit(1);
});
