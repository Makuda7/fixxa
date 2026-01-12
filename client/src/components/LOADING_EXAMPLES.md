# How to Use the Loading Component

The Loading component is now available throughout your app!

## Import it:
```javascript
import Loading from '../components/Loading';
```

## Examples:

### 1. Basic Loading (default)
```javascript
{loading && <Loading />}
```

### 2. Custom Message
```javascript
<Loading message="Loading your profile..." />
```

### 3. Different Sizes
```javascript
<Loading size="small" />   // 100x100px
<Loading size="medium" />  // 200x200px (default)
<Loading size="large" />   // 300x300px
```

### 4. Full Screen Overlay
Perfect for major operations like submitting forms
```javascript
{submitting && <Loading fullScreen message="Saving changes..." />}
```

### 5. No Message
Just show the animation
```javascript
<Loading showMessage={false} />
```

### 6. Custom Animation
Use your own Lottie file:
```javascript
<Loading animationSrc="/animations/my-custom-loader.lottie" />
```

---

## Real Examples from Your App:

### In Settings.js - Profile Loading
```javascript
const Settings = () => {
  const [profileLoading, setProfileLoading] = useState(true);

  // In your render:
  {profileLoading ? (
    <Loading message="Loading your profile..." />
  ) : (
    // Your profile form
  )}
};
```

### In Home.js - Workers Loading
```javascript
const Home = () => {
  const [loading, setLoading] = useState(true);

  // In your render:
  {loading ? (
    <Loading message="Finding professionals near you..." size="large" />
  ) : (
    <ProfessionalCarousel workers={workers} />
  )}
};
```

### In Booking Form - Submission
```javascript
const BookingForm = () => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    // ... submit logic
    setSubmitting(false);
  };

  return (
    <>
      {submitting && <Loading fullScreen message="Creating your booking..." />}
      {/* Your form */}
    </>
  );
};
```

---

## How to Change the Animation:

### Option 1: Use a URL from LottieFiles
1. Visit https://lottiefiles.com/free-animations/loading
2. Find an animation you like
3. Click "Lottie JSON" URL
4. Copy the link
5. Use it:
```javascript
<Loading animationSrc="https://lottie.host/YOUR-ANIMATION-ID/animation.json" />
```

### Option 2: Download and Use Locally
1. Download a .lottie or .json file from LottieFiles
2. Create folder: `/client/public/animations/`
3. Place your file there: `/client/public/animations/loader.lottie`
4. Update the default in Loading.js:
```javascript
animationSrc = "/animations/loader.lottie"
```

---

## Replace Existing Loading States

### Find all your current loading spinners:
```bash
cd /Users/kudadunbetter/Desktop/My website/fixxa/client
grep -r "Loading..." src/
```

### Replace them with:
```javascript
import Loading from '../components/Loading';

// Old:
{loading && <div className="spinner">Loading...</div>}

// New:
{loading && <Loading />}
```

---

## Current Animation
The default animation is a modern circular loader from LottieFiles.

To change it globally, edit:
`/client/src/components/Loading.js` line 39

```javascript
animationSrc = "YOUR_NEW_ANIMATION_URL_HERE"
```

---

## Tips:

1. **Performance:** Lottie animations are very lightweight (usually <50KB)
2. **Accessibility:** The component is screen-reader friendly
3. **Customization:** You can pass any Lottie JSON or .lottie file
4. **Responsive:** Automatically adjusts to different screen sizes
5. **Branded:** Use your own custom animation with Fixxa branding!

---

## Recommended Free Animations:

1. **Circular Loader:** https://lottie.host/4db68bdc-31f6-4cd8-84eb-189de081159a/jlmMLY7WsK.json (current)
2. **Dots Loader:** https://assets2.lottiefiles.com/packages/lf20_usmfx6bp.json
3. **Spinner:** https://assets9.lottiefiles.com/packages/lf20_szlepvdh.json
4. **Progress Bar:** https://assets1.lottiefiles.com/packages/lf20_ysas4vcp.json

Try them out and see which matches your brand!
