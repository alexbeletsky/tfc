#!/usr/bin/env node
// import os from 'os';

import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, useApp, useStdout } from 'ink';
import fs from 'fs/promises';
import path from 'path';

const PANEL_PADDING = 4;

const Commander = ({ children }: { children: React.ReactElement[] }) => (
  <Box
    flexDirection="column"
    width="100%"
    height="100%"
    backgroundColor="blue"
    padding={1}
  >
    {children}
  </Box>
);

const FileTree = ({
  items,
  selectedIndex,
}: {
  items: { name: string; isDirectory: boolean }[];
  selectedIndex: number;
}) => (
  <Box flexDirection="column">
    {items.length === 0 ? (
      <Text color="yellow">No items in this directory.</Text>
    ) : (
      items.map((item, index) => {
        const isSelected = index === selectedIndex;

        const textColor = isSelected
          ? 'black'
          : item.isDirectory
            ? 'cyan'
            : 'white';

        return (
          <Text
            key={item.name}
            color={textColor}
            backgroundColor={isSelected ? 'cyan' : 'blue'}
          >
            {item.name}
          </Text>
        );
      })
    )}
  </Box>
);

// useFileTree hook: Custom hook to read directory contents and manage path
const useFileTree = (targetCwd: string) => {
  // Renamed 'cwd' to 'targetCwd' to avoid confusion with state.cwd
  const [items, setItems] = useState<{ name: string; isDirectory: boolean }[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileTree = async () => {
      try {
        const dirents = await fs.readdir(targetCwd, { withFileTypes: true });
        const sortedItems = dirents
          .map((dirent) => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
          }))
          .sort((a, b) => {
            // Sort directories first, then files, both alphabetically
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;

            return a.name.localeCompare(b.name);
          });

        // Add '..' for navigating up, only if not at the root
        const parentDir = path.dirname(targetCwd);

        const finalItems =
          targetCwd !== parentDir
            ? [{ name: '..', isDirectory: true }, ...sortedItems]
            : sortedItems;

        setItems(finalItems);
        setError(null);
      } catch (err: any) {
        setError(`Error reading directory: ${err.message}`);
        setItems([]);
      }
    };

    fetchFileTree();
  }, [targetCwd]);

  return { items, error };
};

const FilePanel = ({
  dir,
  items,
  selectedIndex,
  scrollOffset,
  contentHeight,
  isActive,
  error = null,
}: {
  dir: string;
  items: { name: string; isDirectory: boolean }[];
  selectedIndex: number;
  scrollOffset: number;
  contentHeight: number;
  isActive: boolean;
  error?: string | null;
}) => {
  const visibleItems = items.slice(scrollOffset, scrollOffset + contentHeight);

  return (
    <Box
      flexDirection="column"
      width="50%"
      paddingX={1}
      borderStyle="round"
      borderColor={isActive ? 'yellow' : 'grey'}
    >
      <Text color="white">{dir}</Text>
      {error && <Text color="red">Error: {error}</Text>}
      <FileTree
        items={visibleItems}
        selectedIndex={selectedIndex - scrollOffset}
      />
    </Box>
  );
};

const PanelScreen = ({ children }: { children: React.ReactElement[] }) => (
  <Box flexDirection="row" flexGrow={1}>
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
  <Box paddingX={1}>
    <Text color="black" backgroundColor="cyan">
      F{functionKey}
    </Text>
    <Text color="white"> {label} </Text>
  </Box>
);

const MainMenu = () => {
  return (
    <Box width="100%" flexDirection="row" paddingX={1}>
      <MenuItem functionKey="3" label="View" />
      <MenuItem functionKey="4" label="Edit" />
      <MenuItem functionKey="5" label="Copy" />
      <MenuItem functionKey="6" label="Move" />
      <MenuItem functionKey="7" label="MkDir" />
      <MenuItem functionKey="8" label="Delete" />
    </Box>
  );
};

const CommandLine = () => (
  <Box paddingX={1}>
    <Text color="white">$ </Text>
  </Box>
);

const useAppState = () => {
  const [state, setState] = React.useState({
    activePanel: 'left' as 'left' | 'right', // Explicitly type activePanel
    leftCwd: '/',
    rightCwd: '/', // os.homedir(), // Start right panel in user's home directory
    leftIndex: 0,
    leftScroll: 0,
    rightIndex: 0,
    rightScroll: 0,
    leftFiles: [] as { name: string; isDirectory: boolean }[], // Updated type
    rightFiles: [] as { name: string; isDirectory: boolean }[], // Updated
  });

  // file contents for panels
  const { items: leftFiles, error: leftFilesError } = useFileTree(
    state.leftCwd,
  );

  const { items: rightFiles, error: rightFilesError } = useFileTree(
    state.rightCwd,
  );

  // Calculate the content height for panels
  const { stdout } = useStdout();
  const panelContentHeight = Math.floor(stdout.rows) - PANEL_PADDING;

  console.log(`Panel content height: ${panelContentHeight}`);

  // exit hook
  const { exit } = useApp();

  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      leftFiles: leftFiles,
      leftFilesError: leftFilesError,
    }));
  }, [leftFiles, leftFilesError]);

  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      rightFiles: rightFiles,
      rightFilesError: rightFilesError,
    }));
  }, [rightFiles, rightFilesError]);

  // Add a useEffect to handle scrolling
  React.useEffect(() => {
    const activeState =
      state.activePanel === 'left'
        ? {
            index: state.leftIndex,
            scroll: state.leftScroll,
          }
        : {
            index: state.rightIndex,
            scroll: state.rightScroll,
          };

    const scrollKey =
      state.activePanel === 'left' ? 'leftScroll' : 'rightScroll';

    let newScroll = activeState.scroll;

    // Scroll down if selection is out of view
    if (activeState.index >= activeState.scroll + panelContentHeight) {
      newScroll = activeState.index - panelContentHeight + 1;
    }
    // Scroll up if selection is out of view
    else if (activeState.index < activeState.scroll) {
      newScroll = activeState.index;
    }

    if (newScroll !== activeState.scroll) {
      setState((prev) => ({
        ...prev,
        [scrollKey]: newScroll,
      }));
    }
  }, [
    state.leftIndex,
    state.rightIndex,
    state.activePanel,
    panelContentHeight,
  ]);

  const togglePanel = () => {
    setState((prev) => ({
      ...prev,
      activePanel: prev.activePanel === 'left' ? 'right' : 'left',
    }));
  };

  useInput(async (input, key) => {
    if (key.tab) {
      togglePanel();
    }

    // Global quit commands
    if (key.escape || input === 'q') {
      exit();
    }

    if (key.upArrow) {
      if (state.activePanel === 'left') {
        setState((prev) => ({
          ...prev,
          leftIndex: Math.max(prev.leftIndex - 1, 0),
        }));
      } else {
        // activePanel === 'right'
        setState((prev) => ({
          ...prev,
          rightIndex: Math.max(prev.rightIndex - 1, 0),
        }));
      }
    }

    if (key.downArrow) {
      if (state.activePanel === 'left') {
        setState((prev) => ({
          ...prev,
          leftIndex: Math.min(
            prev.leftIndex + 1,
            (prev.leftFiles?.length || 1) - 1,
          ), // Corrected to Math.min
        }));
      } else {
        setState((prev) => ({
          ...prev,
          rightIndex: Math.min(
            prev.rightIndex + 1,
            (prev.rightFiles?.length || 1) - 1,
          ), // Corrected to Math.min
        }));
      }
    }

    if (key.return) {
      const currentFiles =
        state.activePanel === 'left' ? leftFiles : rightFiles;
      const currentIndex =
        state.activePanel === 'left' ? state.leftIndex : state.rightIndex;
      const currentCwd =
        state.activePanel === 'left' ? state.leftCwd : state.rightCwd;

      const selectedItem = currentFiles[currentIndex];

      if (!selectedItem) {
        return; // No item selected
      }

      const newPath = path.resolve(currentCwd, selectedItem.name); // Use selectedItem.name

      try {
        const stats = await fs.stat(newPath);
        if (stats.isDirectory()) {
          setState((prev) => ({
            ...prev,
            [state.activePanel === 'left' ? 'leftCwd' : 'rightCwd']: newPath,
            [state.activePanel === 'left' ? 'leftIndex' : 'rightIndex']: 0,
            [state.activePanel === 'left' ? 'leftScroll' : 'rightScroll']: 0,
          }));
        } else {
          // If it's a file, you can add logic here to open it or perform other actions
          console.log(`Selected file: ${newPath}`);
        }
      } catch (err: any) {
        // Handle error accessing directory/file
        const errorKey =
          state.activePanel === 'left' ? 'leftFilesError' : 'rightFilesError';
        setState((prev) => ({
          ...prev,
          [errorKey]: `Error accessing ${selectedItem.name}: ${err.message}`,
        }));
      }
    }
  });

  return {
    ...state,
    leftFiles,
    rightFiles,
    leftFilesError,
    rightFilesError,
    panelContentHeight: panelContentHeight, // Calculate content height based on terminal size
  };
};

const App = () => {
  const {
    activePanel,
    leftCwd,
    rightCwd,
    leftIndex,
    rightIndex,
    leftFiles,
    rightFiles,
    leftScroll,
    rightScroll,
    leftFilesError,
    rightFilesError,
    panelContentHeight,
  } = useAppState();

  return (
    <Commander>
      <PanelScreen>
        <FilePanel
          dir={leftCwd}
          items={leftFiles} // Pass items
          selectedIndex={leftIndex}
          scrollOffset={leftScroll}
          contentHeight={panelContentHeight}
          error={leftFilesError}
          isActive={activePanel === 'left'}
        />
        <FilePanel
          dir={rightCwd}
          items={rightFiles} // Pass items
          selectedIndex={rightIndex}
          scrollOffset={rightScroll}
          contentHeight={panelContentHeight}
          error={rightFilesError}
          isActive={activePanel === 'right'}
        />
      </PanelScreen>
      <CommandLine />
      <MainMenu />
    </Commander>
  );
};

render(<App />);
