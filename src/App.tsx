import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import  ChatInterface  from './components/ChatInterface';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './App.css';

function App() {
  return (
    <MantineProvider>
      <ModalsProvider>
        <Notifications position="top-right" />
        <div className="app">
          <ChatInterface />
        </div>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default App;
