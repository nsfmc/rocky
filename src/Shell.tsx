import React from 'react'

import {PouchProvider, usePouch} from './usePouch';

export const Client = () => {
  return <PouchProvider name="shell-pantry">
    <App />
  </PouchProvider>
}

const App = () => {
  const db = usePouch('shell-pantry')
  

  return <div>
    <button onClick={
      () => {}
    }>
      let's get started
    </button>
  </div>
}

export default App;