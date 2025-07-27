#!/usr/bin/env node
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import fs from 'fs/promises';
const Commander = ({ children }) => (_jsx(Box, { flexDirection: "column", width: "100%", height: "100%", backgroundColor: "black", padding: 1, children: children }));
const FileTree = ({ cwd, tree }) => (_jsx(Box, { flexDirection: "column", padding: 1, children: tree.map((file, index) => (_jsx(Text, { color: "yellow", children: file }, index))) }));
const useFileTree = (cwd) => {
    const currentDir = cwd || '/';
    const [fileTree, setFileTree] = React.useState([]);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        const fetchFileTree = async () => {
            try {
                const files = await fs.readdir(currentDir);
                setFileTree(files);
            }
            catch (err) {
                setError(`Error reading directory: ${err}`);
                setFileTree([]);
            }
        };
        fetchFileTree();
    }, [currentDir]);
    return { fileTree, cwd: currentDir, error };
};
const FilePanel = ({ initialDir, isActive, }) => {
    const { fileTree, cwd, error } = useFileTree(initialDir);
    if (!fileTree) {
        return null;
    }
    return (_jsxs(Box, { flexDirection: "column", width: "50%", padding: 1, borderStyle: "round", backgroundColor: isActive ? 'green' : 'grey', children: [_jsxs(Text, { children: ["Current dir: ", cwd] }), error && _jsxs(Text, { color: "red", children: ["Error: ", error] }), _jsx(FileTree, { cwd: cwd, tree: fileTree })] }));
};
const MainScreen = ({ children }) => (_jsx(Box, { flexDirection: "row", width: "100%", height: "100%", backgroundColor: "cyan", children: children }));
const MenuItem = ({ functionKey, label, }) => (_jsx(Box, { padding: 1, marginRight: 1, children: _jsxs(Text, { color: "white", backgroundColor: "blue", children: [functionKey, " - ", label] }) }));
const MainMenu = () => {
    return (_jsxs(Box, { width: "100%", padding: 1, borderStyle: "single", backgroundColor: "blue", children: [_jsx(MenuItem, { functionKey: "1", label: "File" }), _jsx(MenuItem, { functionKey: "2", label: "Edit" }), _jsx(MenuItem, { functionKey: "3", label: "View" }), _jsx(MenuItem, { functionKey: "4", label: "Help" })] }));
};
const CommandLine = () => (_jsx(Box, { padding: 1, borderStyle: "single", backgroundColor: "grey", children: _jsx(Text, { color: "white", children: "$ " }) }));
const useAppState = () => {
    const [state, setState] = React.useState({
        activePanel: 'LeftPanel',
        cwd: '/',
    });
    const { exit } = useApp();
    const togglePanel = () => {
        setState((prev) => ({
            ...prev,
            activePanel: prev.activePanel === 'LeftPanel' ? 'RightPanel' : 'LeftPanel',
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
    const { state: { activePanel }, cwd, } = useAppState();
    return (_jsxs(Commander, { children: [_jsxs(MainScreen, { children: [_jsx(FilePanel, { initialDir: '/', isActive: activePanel === 'LeftPanel' }), _jsx(FilePanel, { initialDir: cwd, isActive: activePanel === 'RightPanel' })] }), _jsx(CommandLine, {}), _jsx(MainMenu, {})] }));
};
render(_jsx(App, {}));
