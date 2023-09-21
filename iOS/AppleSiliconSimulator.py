#!/usr/bin/env python3
import copy
import fileinput
import os
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

'''
Update an iOS XCFramework that supports device and X86_64 simulator to also
support ARM64 simulator. This is designed to work with
IModelJsNative.xcframework.

Usage: AppleSiliconSimulator.py <Path to xcframework>
'''

def get_versions(src_path: str) -> tuple[str]:
    '''
    Return the minios and SDK versions of the given framework binary file. Note that if the binary
    does not include an explicit minios version, the SDK version will be used.
    '''
    result = subprocess.run(['xcrun', 'vtool', '-arch', 'arm64', '-show', src_path], capture_output=True, text=True)
    minos = None
    sdk = None
    minos_prefix = 'minos '
    sdk_prefix = 'sdk '
    for line in result.stdout.splitlines():
        stripped = line.strip()
        if stripped.startswith(minos_prefix):
            minos = stripped[len(minos_prefix):]
        if stripped.startswith(sdk_prefix):
            sdk = stripped[len(sdk_prefix):]
    if sdk is not None:
        if minos is not None:
            return minos, sdk
        else:
            return sdk, sdk
    raise Exception("Cannot find SDK version in XCFramework!")

def run_command(command: str, error: str | None = None) -> None:
    '''
    Call `os.system` with the specified command and throw an exception with the given error string
    if the exit code from the command is non-zero.
    '''
    if os.system(command) != 0:
        raise Exception(error or f'Error executing command {command}!')

def update_dst_framework(src_path: str, dst_path: str, minios_ver: str, sdk_ver: str) -> None:
    '''
    Replace the binary in `dst_path` with the one from `src_path`, updated to be a Simulator build
    with the given `minios_ver` and `sdk_ver`. The destination is then code signed.
    '''
    print('Updating destination framework to be ARM64 Simulator...\n')
    run_command(
        f'xcrun vtool -arch arm64 -set-build-version 7 {minios_ver} {sdk_ver} -replace -output \'{dst_path}\' \'{src_path}\'',
        'Error updating dst framework!'
    )
    print('\nDone. NOTE: warning about invalid code signature above is expected and normal.')
    print('Doing new codesign for updated framework...\n')
    run_command(
        f'xcrun codesign --force --sign - {dst_path}',
        'Error updating codesign for dst framework!'
    )
    print('\nDone. NOTE: signature replacement warning above is expected and normal.')

def join_frameworks(sim_arm_path: str, sim_intel_path: str, sim_path: str) -> None:
    print('\nCreating Universal binary from Apple Silicon and Intel Simulator frameworks...')
    run_command(
        f'xcrun lipo \'{sim_arm_path}\' \'{sim_intel_path}\' -create -output \'{sim_path}\'',
        'Error creating universal binary!'
    )
    print('Done.')

def find_value(dict_node: ET.Element, key: str) -> ET.Element | None:
    '''
    Find and return the value node associated with the given `key` in `dict_node`. Returns `None`
    if the given key is not found.
    '''
    for index, node in enumerate(dict_node):
        if node.tag == 'key' and node.text.strip() == key:
            return dict_node[index + 1]

def find_required_value(dict_node: ET.Element, key: str) -> ET.Element:
    '''
    Find and return the value node associated with the given `key` in `dict_node`. Raises an
    exception if the given key is not found.
    '''
    value_node = find_value(dict_node, key)
    if value_node is None:
        raise Exception(f'Required value {key} not found!')
    return value_node

def get_library_identifier(dict_node: ET.Element) -> str:
    '''
    Returns the string value of the library identifier in the given `dict_node`. Raises an
    exception if the library identifier is not found, or its value is not a `string` node.
    '''
    library_id = find_required_value(dict_node, 'LibraryIdentifier')
    if library_id.tag != 'string':
        raise Exception(f'Unexpected value type for LibraryIdentifier value: {library_id.tag}')
    return library_id.text.strip()

def update_libraries_array(libraries_array: ET.Element) -> bool:
    '''
    Search the `libraries_array` node for the Intel Simulator entry, rename it to ios-simulator, and
    update it to also support the arm64 architecture. Return `True` if an update happens, or `False`
    if no Intel Simulator entry is found.
    '''
    intel_simulator_index = None
    for index, node in enumerate(libraries_array):
        if node.tag != 'dict':
            raise Exception(f'Found unexpected tag in libraries array: {node.tag}!')
        library_id = get_library_identifier(node)
        if library_id == 'ios-simulator':
            return False # Already have ios-simulator: no update needed
        if library_id == 'ios-x86_64-simulator':
            intel_simulator_index = index
    if intel_simulator_index is None:
        raise Exception('No intel simulator found in libraries array!')
    intel_simulator_node = libraries_array[intel_simulator_index]
    arm_node = intel_simulator_node
    library_id_node = find_required_value(arm_node, 'LibraryIdentifier')
    library_id_node.text = 'ios-simulator'
    supported_archs_node = find_required_value(arm_node, 'SupportedArchitectures')
    if supported_archs_node.tag != 'array':
        raise Exception(f'Found unexpected tag in SupportedArchitectures array: {supported_archs_node.tag}')
    for child in supported_archs_node:
        if child.text.strip() == 'x86_64':
            arm64_node = copy.deepcopy(child)
            child.tail = '\n\t\t\t\t' # Fix indentation of new node
            arm64_node.text = 'arm64'
            supported_archs_node.append(arm64_node)
            return True
    raise Exception("x86_64 architecture not found!")

def update_info_plist(path: str) -> bool:
    '''
    Update the Info.plist file for the XCFramework referenced by `path` to have a Simulator entry
    that supports both Intel and Apple Silicon, instead of just Intel. Returns `True` if the update
    was successful, or `False` if the XCFramework has already been updated.
    '''
    info_plist_path = os.path.join(path, "Info.plist")
    with open(info_plist_path) as input_file:
        header = [next(input_file) for _ in range(2)]
    tree = ET.parse(info_plist_path)
    root = tree.getroot()
    dict_node = root[0]
    if dict_node.tag != 'dict':
        raise Exception('First child in Info.plist is not dict!')
    available_libraries = find_required_value(dict_node, 'AvailableLibraries')
    if available_libraries.tag != 'array':
        raise Exception(f'Found unexpected tag for AvailableLibraries array: {available_libraries.tag}')
    if update_libraries_array(available_libraries):
        tree.write(info_plist_path)
        header_written = False
        for line in fileinput.input(info_plist_path, inplace=True):
            if not header_written:
                header_written = True
                for header_line in header:
                    sys.stdout.write(header_line)
            sys.stdout.write(line)
        return True
    return False

def get_paths(path: str, platform: str) -> dict[str]:
    '''
    Return a dictionary containing various paths related to the given platform.
    '''
    xcframework = os.path.basename(os.path.splitext(path)[0])
    parent_dir = os.path.join(path, platform)
    framework = os.path.join(parent_dir, f'{xcframework}.framework')
    binary = os.path.join(framework, xcframework)
    return {
        'xcframework': xcframework,
        'parent_dir': parent_dir,
        'framework': framework,
        'binary': binary
    }

def process_xcframework(path: str) -> None:
    '''
    Update the XCFramework referenced by `path` to support both Apple Silicon and Intel in its
    simulator, instead of just Intel.
    '''
    device = get_paths(path, 'ios-arm64')
    sim_arm = get_paths(path, 'ios-arm64-simulator')
    sim_intel = get_paths(path, 'ios-x86_64-simulator')
    sim = get_paths(path, 'ios-simulator')
    minios_ver, sdk_ver = get_versions(device['binary'])
    if update_info_plist(path):
        shutil.copytree(device['framework'], sim_arm['framework'])
        shutil.copytree(device['framework'], sim['framework'])
        update_dst_framework(device['binary'], sim_arm['binary'], minios_ver, sdk_ver)
        join_frameworks(sim_arm['binary'], sim_intel['binary'], sim['binary'])
        shutil.rmtree(sim_arm['parent_dir'])
        shutil.rmtree(sim_intel['parent_dir'])
        print(f'{device["xcframework"]} updated.')
    else:
        raise Exception(f'{device["xcframework"]} has already been updated.')

def main() -> None:
    '''
    The AppleSiliconSimulator.py main program.
    '''
    try:
        if len(sys.argv) != 2:
            raise Exception(
'''Update an iOS XCFramework that supports device and X86_64 simulator to also
support ARM64 simulator. This is designed to work with
IModelJsNative.xcframework.

Usage: AppleSiliconSimulator.py <Path to xcframework>''')
        process_xcframework(sys.argv[1])
    except (Exception, shutil.Error) as e:
        print(e)
        sys.exit(1)

if __name__ == '__main__':
    main()
