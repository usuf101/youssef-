# Fruit Spawner Setup Guide for CPE Project

## ✅ What's Already Done

I've added 4 new components to your project:
- `fruit-spawner.js` - Spawns fruits on demand
- `fruit.js` - Handles fruit physics
- `fruit-animator.js` - Handles fruit animations
- `spawn-button.js` - Triggers spawning when clicked

All components are registered in `js/index.js` and ready to use!

## 🎯 How to Set Up in Wonderland Engine Editor

### Step 1: Create a Fruit Prefab Object

1. Open your project in Wonderland Engine Editor (`cpeproject.wlp`)
2. In the scene hierarchy, create a new object called **"FruitPrefab"**
3. Add a **Mesh** component to it:
   - Set the mesh to a sphere, cube, or import your own fruit model
   - Set a material/color
4. Add the **fruit** component to it
5. Add the **fruit-animator** component to it
6. **Important**: Make the FruitPrefab object **inactive** (uncheck "active" in properties)
   - This is just a template, not a visible object

### Step 2: Create the Spawner Object

1. Create a new empty object called **"FruitSpawner"**
2. Position it where you want fruits to spawn from (e.g., Y = 0 at ground level)
3. Add the **fruit-spawner** component to it
4. In the component properties:
   - **fruitPrefab**: Drag the FruitPrefab object here
   - **launchForce**: 2.0 (adjust for higher/lower throws)
   - **spawnAreaWidth**: 5.0 (adjust for wider/narrower spawn area)

### Step 3: Create or Modify Your Button

**Option A: Use an existing button**
1. Find your existing button object in the scene
2. Add the **spawn-button** component to it
3. In the component properties:
   - **spawnerObject**: Drag the FruitSpawner object here

**Option B: Create a new button**
1. Create a new object (e.g., a cube or sphere mesh)
2. Add a **Mesh** component with a visible mesh
3. Add a **Collision** component (so it can be clicked)
4. Add a **cursor-target** component (for VR cursor interaction)
5. Add the **spawn-button** component
6. In the spawn-button properties:
   - **spawnerObject**: Drag the FruitSpawner object here

### Step 4: Test It!

1. Save your scene
2. Click the "Play" button in the editor or run the project
3. Click your button (with mouse or VR controller)
4. A fruit should spawn, scale up, rotate, fly upward, and fall down!

## 🎮 How It Works

1. **Click button** → SpawnButton.onClick() is triggered
2. **SpawnButton** → Calls FruitSpawner.spawnFruit()
3. **FruitSpawner** → Creates a clone of the fruit prefab at a random X position
4. **Fruit** → Gets launched upward with physics
5. **FruitAnimator** → Scales up and rotates the fruit
6. **Fruit** → Falls due to gravity and destroys itself when Y < -2

## 🔧 Customization

### Adjust Launch Height
In FruitSpawner component:
- Increase `launchForce` for higher throws
- Decrease for lower throws

### Adjust Spawn Area
In FruitSpawner component:
- Increase `spawnAreaWidth` for wider spawn area
- Decrease for narrower spawn area

### Adjust Animation Speed
In FruitAnimator component:
- Change `showDuration` for faster/slower scale-up
- Change `rotateSpeed` for faster/slower rotation

### Adjust Physics
In Fruit component:
- Change `gravity` for stronger/weaker gravity
- Change `initialVelocity` for different launch speeds

## 🐛 Troubleshooting

**Button doesn't work:**
- Make sure the button has a collision component
- Make sure the button has cursor-target component
- Check console for "SpawnButton clicked!" message

**Fruits don't appear:**
- Make sure FruitPrefab has a visible mesh
- Check that spawnerObject is set in SpawnButton
- Check that fruitPrefab is set in FruitSpawner

**Fruits spawn but don't move:**
- Make sure the Fruit component is added to the prefab
- Check that launch() is being called (console log)

**Console errors:**
- Open browser console (F12) to see error messages
- Look for warnings about missing references
