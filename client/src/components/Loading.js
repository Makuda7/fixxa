import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import './Loading.css';

/**
 * Reusable Loading Component with Lottie Animation
 *
 * Usage examples:
 *
 * Basic:
 * <Loading />
 *
 * Custom message:
 * <Loading message="Loading your profile..." />
 *
 * Different sizes:
 * <Loading size="small" />
 * <Loading size="large" />
 *
 * Full screen overlay:
 * <Loading fullScreen message="Processing..." />
 *
 * No message:
 * <Loading showMessage={false} />
 *
 * Custom animation:
 * To use your own Lottie animation:
 * 1. Download a .lottie or .json file from https://lottiefiles.com
 * 2. Place it in /public/animations/your-animation.lottie
 * 3. Update the src prop below to: "/animations/your-animation.lottie"
 */
const Loading = ({
  size = 'medium',
  message = 'Loading...',
  showMessage = true,
  fullScreen = false,
  // You can override with your own animation URL or local path
  animationSrc = "https://lottie.host/58f368e6-8aa5-4355-892a-5f3759c09ecb/yEnNq7hE7V.json"
}) => {
  const sizes = {
    small: 100,
    medium: 200,
    large: 300
  };

  const containerClass = fullScreen ? 'loading-container-fullscreen' : 'loading-container';

  return (
    <div className={containerClass}>
      <DotLottieReact
        src={animationSrc}
        loop
        autoplay
        style={{ width: sizes[size], height: sizes[size] }}
      />
      {showMessage && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default Loading;
