# EXACT Setup Steps for Your CPE Project

## ✅ What You Already Have
- Button object (ID: 197) in your scene
- Fruit models in `models/fruits/scene.gltf`
- All code components installed and registered

## 📋 Follow These Exact Steps in Wonderland Engine Editor

### Step 1: Create Fruit Prefab (2 minutes)

1. **Open** `cpeproject.wlp` in Wonderland Engine Editor
2. In the **Scene Hierarchy** (left panel), right-click and select **"Add Object"**
3. Name it: **"FruitPrefab"**
4. With FruitPrefab selected, in the **Properties panel** (right side):
   - Click **"Add Component"** → Select **"mesh"**
   - In the mesh component:
     - Click the folder icon next to "Mesh"
     - Navigate to: `models/fruits/scene.gltf`
     - Select one of the fruit meshes (apple, banana, etc.)
   - Click **"Add Component"** → Select **"fruit"** (your custom component)
   - Click **"Add Component"** → Select **"fruit-animator"** (your custom component)
   - **IMPORTANT**: Uncheck the **"Active"** checkbox at the top of the properties panel
     (This makes it a template that won't appear in the scene)

### Step 2: Create Spawner Object (1 minute)

1. In the **Scene Hierarchy**, right-click and select **"Add Object"**
2. Name it: **"FruitSpawner"**
3. Position it at ground level:
   - In Properties panel, set **Translation**:
     - X: 0
     - Y: 0 (or wherever your ground is)
     - Z: 0
4. Click **"Add Component"** → Select **"fruit-spawner"**
5. In the fruit-spawner component properties:
   - **fruitPrefab**: Drag the **FruitPrefab** object from hierarchy into this field
   - **launchForce**: 2.0 (default is fine)
   - **spawnAreaWidth**: 5.0 (default is fine)

### Step 3: Connect Button to Spawner (1 minute)

1. In the **Scene Hierarchy**, find your existing **"Button"** object (ID: 197)
2. Select it
3. In the **Properties panel**, click **"Add Component"** → Select **"spawn-button"**
4. In the spawn-button component properties:
   - **spawnerObject**: Drag the **FruitSpawner** object from hierarchy into this field

### Step 4: Make Sure Button is Clickable

1. With the **Button** object still selected, check that it has:
   - ✅ A **mesh** component (should already have this)
   - ✅ A **collision** component (add if missing: Add Component → collision)
   - ✅ A **cursor-target** component (add if missing: Add Component → cursor-target)

### Step 5: Test It! 🎮

1. Click the **Play** button (▶️) in the editor toolbar
2. Click your button with the mouse (or VR controller)
3. You should see:
   - A fruit spawns
   - It scales up smoothly
   - It rotates
   - It flies upward
   - It falls back down due to gravity
   - It disappears when it falls below the ground

## 🐛 If It Doesn't Work

**Check the browser console (F12):**
- You should see "SpawnButton clicked!" when you click
- You should see "Fruit spawned!" after clicking
- If you see warnings, they'll tell you what's missing

**Common issues:**
- "No spawnerObject set" → You didn't drag FruitSpawner into the button's spawn-button component
- "No fruitPrefab set" → You didn't drag FruitPrefab into the spawner's fruit-spawner component
- Button doesn't respond → Missing collision or cursor-target component

## 🎨 Customization After It Works

Once it's working, you can:
- Change which fruit model is used (in FruitPrefab's mesh component)
- Adjust launch height (launchForce in spawner)
- Adjust spawn area width (spawnAreaWidth in spawner)
- Adjust animation speed (in fruit-animator component)

---

**Total time: ~4 minutes** ⏱️

The code is ready - just follow these steps to connect everything visually!
