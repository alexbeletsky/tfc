#!/usr/bin/env node

import React, { useState, useEffect, useCallback } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import fs from 'fs/promises';
import os from 'os'; // Imported by user, kept for potential future use
import path from 'path';

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

// FileTree component: Displays the list of files and directories
const FileTree = ({
	items,
	selectedIndex,
}: {
	items: { name: string; isDirectory: boolean }[]; // Updated type to include isDirectory
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

	return { items, error }; // No longer returns currentPath, as it's managed by useAppState
};

// FilePanel component: Represents a single file browsing panel
const FilePanel = ({
	dir,
	items, // Renamed 'files' to 'items' for consistency
	selectedIndex,
	isActive,
	error = null,
}: {
	dir: string;
	items: { name: string; isDirectory: boolean }[]; // Updated type
	selectedIndex: number;
	isActive: boolean;
	error?: string | null;
}) => (
	<Box
		flexDirection="column"
		width="50%"
		paddingX={1}
		borderStyle="round"
		borderColor={isActive ? 'yellow' : 'grey'} // Highlight border if active
	>
		<Text color="white">{dir}</Text>
		{error && <Text color="red">Error: {error}</Text>}
		{/* Pass items and selectedIndex to FileTree */}
		<FileTree items={items} selectedIndex={selectedIndex} />
	</Box>
);

// PanelScreen component: Holds the two file panels (renamed from MainScreen by user)
const PanelScreen = ({ children }: { children: React.ReactElement[] }) => (
	<Box flexDirection="row" flexGrow={1}>
		{children}
	</Box>
);

// MenuItem component: For the bottom menu bar
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

// MainMenu component: The bottom menu bar
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

// CommandLine component: The command input area
const CommandLine = () => (
	<Box paddingX={1}>
		<Text color="white">$ </Text>
	</Box>
);

// useAppState hook: Manages the global application state, like active panel and file navigation
const useAppState = () => {
  const [state, setState] = React.useState({
    activePanel: 'left' as 'left' | 'right', // Explicitly type activePanel
    leftCwd: '/',
    rightCwd: '/', // os.homedir(), // Start right panel in user's home directory
    leftIndex: 0,
    rightIndex: 0,
    leftFiles: [] as { name: string; isDirectory: boolean }[], // Updated type
    rightFiles: [] as { name: string; isDirectory: boolean }[], // Updated
  });

  // Fetch file trees for both panels using the useFileTree hook
  const { items: leftFiles, error: leftFilesError } = useFileTree(
    state.leftCwd,
  );

  const { items: rightFiles, error: rightFilesError } = useFileTree(
    state.rightCwd,
  );

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
  };
};

// App component: The root component of the Ink application
const App = () => {
  const {
    activePanel,
    leftCwd,
    rightCwd,
    leftIndex,
    rightIndex,
    leftFiles,
    rightFiles,
    leftFilesError,
    rightFilesError,
  } = useAppState();

  return (
    <Commander>
      <PanelScreen>
        <FilePanel
          dir={leftCwd}
          items={leftFiles} // Pass items
          selectedIndex={leftIndex}
          error={leftFilesError}
          isActive={activePanel === 'left'}
        />
        <FilePanel
          dir={rightCwd}
          items={rightFiles} // Pass items
          selectedIndex={rightIndex}
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
