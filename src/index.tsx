#!/usr/bin/env node

import React, { useState, useEffect, useCallback } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import fs from 'fs/promises';
import os from 'os'; // Imported by user, kept for potential future use
import path from 'path';

// Commander component: The main container for the entire application
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

// FileTree component: Displays the list of files and directories
const FileTree = ({
  items, // Renamed 'tree' to 'items' for consistency with useFileTree output
  selectedIndex,
}: {
  items: { name: string; isDirectory: boolean }[]; // Updated type to include isDirectory
  selectedIndex: number;
}) => (
  <Box flexDirection="column" padding={1}>
    {items.length === 0 ? (
      <Text color="yellow">No items in this directory.</Text>
    ) : (
      items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Text
            key={item.name}
            color={isSelected ? 'yellow' : 'white'}
            inverse={isSelected}
          >
            {isSelected ? '> ' : '  '} {/* Highlight indicator */}
            {item.isDirectory ? (
              <Text color="blue">[{item.name}]</Text>
            ) : (
              item.name
            )}
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
    padding={1}
    borderStyle="round"
    backgroundColor={isActive ? 'green' : 'grey'} // User's requested background color
    borderColor={isActive ? 'yellow' : 'grey'} // Highlight border if active
  >
    <Text>Current dir: {dir}</Text>
    {error && <Text color="red">Error: {error}</Text>}
    {/* Pass items and selectedIndex to FileTree */}
    <FileTree items={items} selectedIndex={selectedIndex} />
  </Box>
);

// PanelScreen component: Holds the two file panels (renamed from MainScreen by user)
const PanelScreen = ({ children }: { children: React.ReactElement[] }) => (
  <Box flexDirection="row" width="100%" height="100%" backgroundColor="cyan">
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
  <Box padding={1} marginRight={1}>
    <Text color="white" backgroundColor="blue">
      {functionKey} - {label}
    </Text>
  </Box>
);

// MainMenu component: The bottom menu bar
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

// CommandLine component: The command input area
const CommandLine = () => (
  <Box padding={1} borderStyle="single" backgroundColor="grey">
    <Text color="white">$ </Text>
  </Box>
);

// useAppState hook: Manages the global application state, like active panel and file navigation
const useAppState = () => {
  const [state, setState] = React.useState({
    activePanel: 'left' as 'left' | 'right', // Explicitly type activePanel
    leftCwd: '/',
    rightCwd: os.homedir(), // Start right panel in user's home directory
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

  // Effect to update file lists in state when useFileTree provides new data
  // This is crucial because useFileTree is asynchronous
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
        // activePanel === 'right'
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

// Render the Ink application
render(<App />);

// ----------------------

// #!/usr/bin/env node

// import React from 'react';
// import { render, Text, Box, useInput, useApp } from 'ink';
// import fs from 'fs/promises';
// import os from 'os';
// import path from 'path';

// const Commander = ({ children }: { children: React.ReactElement[] }) => (
//   <Box
//     flexDirection="column"
//     width="100%"
//     height="100%"
//     backgroundColor="black"
//     padding={1}
//   >
//     {children}
//   </Box>
// );

// const FileTree = ({
//   cwd,
//   tree,
//   selectedIndex,
// }: {
//   cwd: string;
//   tree: string[];
//   selectedIndex: number;
// }) => (
//   <Box flexDirection="column" padding={1}>
//     {tree.map((file, index) => {
//       const isSelected = index === selectedIndex;
//       return (
//         <Text key={index} color="yellow" inverse={isSelected}>
//           {file}
//         </Text>
//       );
//     })}
//   </Box>
// );

// const useFileTree = (cwd: string) => {
//   const currentDir = cwd || '/';

//   const [fileTree, setFileTree] = React.useState<string[]>([]);
//   const [error, setError] = React.useState<string | null>(null);

//   React.useEffect(() => {
//     const fetchFileTree = async () => {
//       try {
//         const files = await fs.readdir(currentDir);
//         setFileTree(['..', ...files]);
//       } catch (err) {
//         setError(`Error reading directory: ${err}`);
//         setFileTree([]);
//       }
//     };

//     fetchFileTree();
//   }, [currentDir]);

//   return { fileTree, cwd: currentDir, error };
// };

// const FilePanel = ({
//   dir,
//   files,
//   selectedIndex,
//   isActive,
//   error = null,
// }: {
//   dir: string;
//   files: string[];
//   selectedIndex: number;
//   isActive: boolean;
//   error?: string | null;
// }) => (
//   <Box
//     flexDirection="column"
//     width="50%"
//     padding={1}
//     borderStyle="round"
//     backgroundColor={isActive ? 'green' : 'grey'}
//   >
//     <Text>Current dir: {dir}</Text>
//     {error && <Text color="red">Error: {error}</Text>}
//     <FileTree cwd={dir} tree={files} selectedIndex={selectedIndex} />
//   </Box>
// );

// const PanelScreen = ({ children }: { children: React.ReactElement[] }) => (
//   <Box flexDirection="row" width="100%" height="100%" backgroundColor="cyan">
//     {children}
//   </Box>
// );

// const MenuItem = ({
//   functionKey,
//   label,
// }: {
//   functionKey: string;
//   label: string;
// }) => (
//   <Box padding={1} marginRight={1}>
//     <Text color="white" backgroundColor="blue">
//       {functionKey} - {label}
//     </Text>
//   </Box>
// );

// const MainMenu = () => {
//   return (
//     <Box width="100%" padding={1} borderStyle="single" backgroundColor="blue">
//       <MenuItem functionKey="1" label="File" />
//       <MenuItem functionKey="2" label="Edit" />
//       <MenuItem functionKey="3" label="View" />
//       <MenuItem functionKey="4" label="Help" />
//     </Box>
//   );
// };

// const CommandLine = () => (
//   <Box padding={1} borderStyle="single" backgroundColor="grey">
//     <Text color="white">$ </Text>
//   </Box>
// );

// const useAppState = () => {
//   const [state, setState] = React.useState({
//     activePanel: 'left',
//     leftCwd: '/',
//     rightCwd: '/',
//     leftIndex: 0,
//     rightIndex: 0,
//     leftFiles: [],
//     rightFiles: [],
//   });

//   const { fileTree: leftFiles, error: leftFilesError } = useFileTree(
//     state.leftCwd,
//   );
//   const { fileTree: rightFiles, error: rightFilesError } = useFileTree(
//     state.rightCwd,
//   );

//   const { exit } = useApp();

//   const togglePanel = () => {
//     setState((prev) => ({
//       ...prev,
//       activePanel: prev.activePanel === 'left' ? 'right' : 'left',
//     }));
//   };

//   useInput(async (input, key) => {
//     if (key.tab) {
//       togglePanel();
//     }

//     if (key.escape) {
//       exit();
//     }

//     if (key.upArrow) {
//       if (state.activePanel === 'left') {
//         setState((prev) => ({
//           ...prev,
//           leftIndex: Math.max(prev.leftIndex - 1, 0),
//         }));
//       }
//       if (state.activePanel === 'right') {
//         setState((prev) => ({
//           ...prev,
//           rightIndex: Math.max(prev.rightIndex - 1, 0),
//         }));
//       }
//     }

//     if (key.downArrow) {
//       if (state.activePanel === 'left') {
//         setState((prev) => ({
//           ...prev,
//           leftIndex: Math.max(prev.leftIndex + 1, prev.leftFiles.length - 1),
//         }));
//       }
//       if (state.activePanel === 'right') {
//         setState((prev) => ({
//           ...prev,
//           rightIndex: Math.max(prev.rightIndex + 1, prev.rightFiles.length - 1),
//         }));
//       }
//     }

//     if (key.return) {
//       if (state.activePanel === 'left') {
//         const selectedItem = leftFiles[state.leftIndex];
//         if (!selectedItem || path.extname(selectedItem)) {
//           return; // Do nothing if it's a file
//         }
//         const newPath = path.resolve(state.leftCwd, selectedItem);
//         try {
//           const stats = await fs.stat(newPath);
//           if (stats.isDirectory()) {
//             setState((prev) => ({
//               ...prev,
//               leftCwd: newPath,
//               leftIndex: 0,
//             }));
//           }
//         } catch (err) {
//           setState((prev) => ({
//             ...prev,
//             leftCwd: state.leftCwd,
//             leftFiles: state.leftFiles,
//             leftFilesError: `Error accessing directory: ${err}`,
//           }));
//         }
//       } else {
//         const selectedItem = rightFiles[state.rightIndex];
//         if (!selectedItem || path.extname(selectedItem)) {
//           return; // Do nothing if it's a file
//         }
//         const newPath = path.resolve(state.rightCwd, selectedItem);

//         try {
//           const stats = await fs.stat(newPath);
//           if (stats.isDirectory()) {
//             setState((prev) => ({
//               ...prev,
//               rightCwd: newPath,
//               rightIndex: 0,
//             }));
//           }
//         } catch (err) {
//           setState((prev) => ({
//             ...prev,
//             rightCwd: state.rightCwd,
//             rightFiles: state.rightFiles,
//             rightFilesError: `Error accessing directory: ${err}`,
//           }));
//         }
//       }
//     }
//   });

//   return {
//     ...state,
//     leftFiles,
//     rightFiles,
//     leftFilesError,
//     rightFilesError,
//   };
// };

// const App = () => {
//   const {
//     activePanel,
//     leftCwd,
//     rightCwd,
//     leftIndex,
//     rightIndex,
//     leftFiles,
//     rightFiles,
//     leftFilesError,
//     rightFilesError,
//   } = useAppState();

//   return (
//     <Commander>
//       <PanelScreen>
//         <FilePanel
//           dir={leftCwd}
//           files={leftFiles}
//           selectedIndex={leftIndex}
//           error={leftFilesError}
//           isActive={activePanel === 'left'}
//         />
//         <FilePanel
//           dir={rightCwd}
//           files={rightFiles}
//           selectedIndex={rightIndex}
//           error={rightFilesError}
//           isActive={activePanel === 'right'}
//         />
//       </PanelScreen>
//       <CommandLine />
//       <MainMenu />
//     </Commander>
//   );
// };

// render(<App />);
