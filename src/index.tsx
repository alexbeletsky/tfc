#!/usr/bin/env node

import React from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import fs from 'fs/promises';

const Commander = ({ children }: { children: React.ReactElement[] }) => (
  <Box
    flexDirection="column"
    width="100%"
    height="100%"
    backgroundColor="black"
    padding={1}
  >
    {children}
  </Box>
);

const FileTree = ({ cwd, tree }: { cwd: string; tree: string[] }) => (
  <Box flexDirection="column" padding={1}>
    {tree.map((file, index) => (
      <Text key={index} color="yellow">
        {file}
      </Text>
    ))}
  </Box>
);

const useFileTree = (cwd: string) => {
  const currentDir = cwd || '/';

  const [fileTree, setFileTree] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchFileTree = async () => {
      try {
        const files = await fs.readdir(currentDir);
        setFileTree(files);
      } catch (err) {
        setError(`Error reading directory: ${err}`);
        setFileTree([]);
      }
    };

    fetchFileTree();
  }, [currentDir]);

  return { fileTree, cwd: currentDir, error };
};

const FilePanel = ({
  initialDir,
  isActive,
}: {
  initialDir: string;
  isActive: boolean;
}) => {
  const { fileTree, cwd, error } = useFileTree(initialDir);

  if (!fileTree) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      width="50%"
      padding={1}
      borderStyle="round"
      backgroundColor={isActive ? 'green' : 'grey'}
    >
      <Text>Current dir: {cwd}</Text>
      {error && <Text color="red">Error: {error}</Text>}
      <FileTree cwd={cwd} tree={fileTree} />
    </Box>
  );
};

const MainScreen = ({ children }: { children: React.ReactElement[] }) => (
  <Box flexDirection="row" width="100%" height="100%" backgroundColor="cyan">
    {children}
  </Box>
);

const MenuItem = ({
  functionKey,
  label,
}: {
  functionKey: string;
  label: string;
}) => (
  <Box padding={1} marginRight={1}>
    <Text color="white" backgroundColor="blue">
      {functionKey} - {label}
    </Text>
  </Box>
);

const MainMenu = () => {
  return (
    <Box width="100%" padding={1} borderStyle="single" backgroundColor="blue">
      <MenuItem functionKey="1" label="File" />
      <MenuItem functionKey="2" label="Edit" />
      <MenuItem functionKey="3" label="View" />
      <MenuItem functionKey="4" label="Help" />
    </Box>
  );
};

const CommandLine = () => (
  <Box padding={1} borderStyle="single" backgroundColor="grey">
    <Text color="white">$ </Text>
  </Box>
);

const useAppState = () => {
  const [state, setState] = React.useState({
    activePanel: 'LeftPanel',
    cwd: '/',
  });

  const { exit } = useApp();

  const togglePanel = () => {
    setState((prev) => ({
      ...prev,
      activePanel:
        prev.activePanel === 'LeftPanel' ? 'RightPanel' : 'LeftPanel',
    }));
  };

  useInput((input, key) => {
    if (key.tab) {
      togglePanel();
    }

    if (key.escape) {
      exit();
    }
  });

  return { state, togglePanel, cwd: state.cwd };
};

const App = () => {
  const {
    state: { activePanel },
    cwd,
  } = useAppState();

  return (
    <Commander>
      <MainScreen>
        <FilePanel initialDir={'/'} isActive={activePanel === 'LeftPanel'} />
        <FilePanel initialDir={cwd} isActive={activePanel === 'RightPanel'} />
      </MainScreen>
      <CommandLine />
      <MainMenu />
    </Commander>
  );
};

render(<App />);
