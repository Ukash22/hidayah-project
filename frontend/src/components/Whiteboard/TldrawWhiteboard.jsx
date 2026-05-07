import React from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

const TldrawWhiteboard = ({ roomId, role }) => {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Tldraw 
        inferDarkMode 
        // WebSocket sync will be added in Phase 3
      />
    </div>
  );
};

export default TldrawWhiteboard;
