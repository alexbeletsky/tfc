#!/usr/bin/env node
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import fs from 'fs/promises';
import os from 'os'; // Imported by user, kept for potential future use
import path from 'path';
// Commander component: The main container for the entire application
const Commander = ({ children }) => (_jsx(Box, { flexDirection: "column", width: "100%", height: "100%", backgroundColor: "black", padding: 1, children: children }));
// FileTree component: Displays the list of files and directories
const FileTree = ({ items, // Renamed 'tree' to 'items' for consistency with useFileTree output
selectedIndex, }) => (_jsx(Box, { flexDirection: "column", padding: 1, children: items.length === 0 ? (_jsx(Text, { color: "yellow", children: "No items in this directory." })) : (items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (_jsxs(Text, { color: isSelected ? 'yellow' : 'white', inverse: isSelected, children: [isSelected ? '> ' : '  ', " ", item.isDirectory ? (_jsxs(Text, { color: "blue", children: ["[", item.name, "]"] })) : (item.name)] }, item.name));
    })) }));
// useFileTree hook: Custom hook to read directory contents and manage path
const useFileTree = (targetCwd) => {
    // Renamed 'cwd' to 'targetCwd' to avoid confusion with state.cwd
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
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
                    if (a.isDirectory && !b.isDirectory)
                        return -1;
                    if (!a.isDirectory && b.isDirectory)
                        return 1;
                    return a.name.localeCompare(b.name);
                });
                // Add '..' for navigating up, only if not at the root
                const parentDir = path.dirname(targetCwd);
                const finalItems = targetCwd !== parentDir
                    ? [{ name: '..', isDirectory: true }, ...sortedItems]
                    : sortedItems;
                setItems(finalItems);
                setError(null);
            }
            catch (err) {
                setError(`Error reading directory: ${err.message}`);
                setItems([]);
            }
        };
        fetchFileTree();
    }, [targetCwd]);
    return { items, error }; // No longer returns currentPath, as it's managed by useAppState
};
// FilePanel component: Represents a single file browsing panel
const FilePanel = ({ dir, items, // Renamed 'files' to 'items' for consistency
selectedIndex, isActive, error = null, }) => (_jsxs(Box, { flexDirection: "column", width: "50%", padding: 1, borderStyle: "round", backgroundColor: isActive ? 'green' : 'grey', borderColor: isActive ? 'yellow' : 'grey', children: [_jsxs(Text, { children: ["Current dir: ", dir] }), error && _jsxs(Text, { color: "red", children: ["Error: ", error] }), _jsx(FileTree, { items: items, selectedIndex: selectedIndex })] }));
// PanelScreen component: Holds the two file panels (renamed from MainScreen by user)
const PanelScreen = ({ children }) => (_jsx(Box, { flexDirection: "row", width: "100%", height: "100%", backgroundColor: "cyan", children: children }));
// MenuItem component: For the bottom menu bar
const MenuItem = ({ functionKey, label, }) => (_jsx(Box, { padding: 1, marginRight: 1, children: _jsxs(Text, { color: "white", backgroundColor: "blue", children: [functionKey, " - ", label] }) }));
// MainMenu component: The bottom menu bar
const MainMenu = () => {
    return (_jsxs(Box, { width: "100%", padding: 1, borderStyle: "single", backgroundColor: "blue", children: [_jsx(MenuItem, { functionKey: "1", label: "File" }), _jsx(MenuItem, { functionKey: "2", label: "Edit" }), _jsx(MenuItem, { functionKey: "3", label: "View" }), _jsx(MenuItem, { functionKey: "4", label: "Help" })] }));
};
// CommandLine component: The command input area
const CommandLine = () => (_jsx(Box, { padding: 1, borderStyle: "single", backgroundColor: "grey", children: _jsx(Text, { color: "white", children: "$ " }) }));
// useAppState hook: Manages the global application state, like active panel and file navigation
const useAppState = () => {
    const [state, setState] = React.useState({
        activePanel: 'left', // Explicitly type activePanel
        leftCwd: '/',
        rightCwd: os.homedir(), // Start right panel in user's home directory
        leftIndex: 0,
        rightIndex: 0,
        leftFiles: [], // Updated type
        rightFiles: [], // Updated
    });
    // Fetch file trees for both panels using the useFileTree hook
    const { items: leftFiles, error: leftFilesError } = useFileTree(state.leftCwd);
    const { items: rightFiles, error: rightFilesError } = useFileTree(state.rightCwd);
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
            }
            else {
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
                    leftIndex: Math.min(prev.leftIndex + 1, (prev.leftFiles?.length || 1) - 1), // Corrected to Math.min
                }));
            }
            else {
                // activePanel === 'right'
                setState((prev) => ({
                    ...prev,
                    rightIndex: Math.min(prev.rightIndex + 1, (prev.rightFiles?.length || 1) - 1), // Corrected to Math.min
                }));
            }
        }
        if (key.return) {
            const currentFiles = state.activePanel === 'left' ? leftFiles : rightFiles;
            const currentIndex = state.activePanel === 'left' ? state.leftIndex : state.rightIndex;
            const currentCwd = state.activePanel === 'left' ? state.leftCwd : state.rightCwd;
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
                }
                else {
                    // If it's a file, you can add logic here to open it or perform other actions
                    console.log(`Selected file: ${newPath}`);
                }
            }
            catch (err) {
                // Handle error accessing directory/file
                const errorKey = state.activePanel === 'left' ? 'leftFilesError' : 'rightFilesError';
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
    const { activePanel, leftCwd, rightCwd, leftIndex, rightIndex, leftFiles, rightFiles, leftFilesError, rightFilesError, } = useAppState();
    return (_jsxs(Commander, { children: [_jsxs(PanelScreen, { children: [_jsx(FilePanel, { dir: leftCwd, items: leftFiles, selectedIndex: leftIndex, error: leftFilesError, isActive: activePanel === 'left' }), _jsx(FilePanel, { dir: rightCwd, items: rightFiles, selectedIndex: rightIndex, error: rightFilesError, isActive: activePanel === 'right' })] }), _jsx(CommandLine, {}), _jsx(MainMenu, {})] }));
};
// Render the Ink application
render(_jsx(App, {}));
