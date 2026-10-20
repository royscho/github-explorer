import React from 'react';

import { AppProviders } from '@app/providers';
import { AppNavigationContainer, RootStack } from '@app/navigation';

function App(): React.JSX.Element {
  return (
    <AppProviders>
      <AppNavigationContainer>
        <RootStack />
      </AppNavigationContainer>
    </AppProviders>
  );
}

export default App;
