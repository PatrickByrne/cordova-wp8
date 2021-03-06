/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
*/


var fso = WScript.CreateObject('Scripting.FileSystemObject'),
    wscript_shell = WScript.CreateObject("WScript.Shell");

var args = WScript.Arguments,
    ROOT = WScript.ScriptFullName.split('\\tooling\\', 1),
    // path to CordovaDeploy.exe
    CORDOVA_DEPLOY_EXE = '\\tooling\\CordovaDeploy\\CordovaDeploy\\bin\\Debug\\CordovaDeploy.exe',
    // path to CordovaDeploy
    CORDOVA_DEPLOY = '\\tooling\\CordovaDeploy';


// help function
function Usage()
{
    WScript.StdOut.WriteLine("");
    WScript.StdOut.WriteLine("Usage: [ debug | emulate ] [ PathTOProjectFolder ] ");
    WScript.StdOut.WriteLine("    PathTOProjectFolder : The path to the project being launched.");
    WScript.StdOut.WriteLine("examples:");
    WScript.StdOut.WriteLine("    debug C:\\Users\\anonymous\\Desktop\\MyProject");
    WScript.StdOut.WriteLine("    emulate C:\\Users\\anonymous\\Desktop\\MyBetterProject");
    WScript.StdOut.WriteLine("    deploy C:\\Users\\anonymous\\Desktop\\TheProject -emulate");
    WScript.StdOut.WriteLine("");
}



var ForReading = 1, ForWriting = 2, ForAppending = 8;
var TristateUseDefault = 2, TristateTrue = 1, TristateFalse = 0;


// executes a commmand in the shell
function exec(command) {
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        WScript.sleep(100);
    }
}

// executes a commmand in the shell
function exec_verbose(command) {
    //WScript.StdOut.WriteLine("Command: " + command);
    var oShell=wscript_shell.Exec(command);
    while (oShell.Status == 0) {
        //Wait a little bit so we're not super looping
        WScript.sleep(100);
        //Print any stdout output from the script
        if(!oShell.StdOut.AtEndOfStream) {
            var line = oShell.StdOut.ReadLine();
            WScript.StdOut.WriteLine(line);
        }
    }
    //Check to make sure our scripts did not encounter an error
    if(!oShell.StdErr.AtEndOfStream)
    {
        var line = oShell.StdErr.ReadAll();
        WScript.StdErr.WriteLine(line);
        WScript.Quit(1);
    }
}

// returns the contents of a file
function read(filename) {
    //WScript.Echo('Reading in ' + filename);
    if(fso.FileExists(filename))
    {
        var f=fso.OpenTextFile(filename, 1,2);
        var s=f.ReadAll();
        f.Close();
        return s;
    }
    else
    {
        WScript.StdErr.WriteLine('Cannot read non-existant file : ' + filename);
        WScript.Quit(1);
    }
    return null;
}

// builds the project and .xap
function build_xap(path)
{
    WScript.StdOut.WriteLine("Building Cordova-WP8 Project:");
    WScript.StdOut.WriteLine("\tDirectory : " + path);

    // delete any previously generated files
    if(fso.FolderExists(path + "\\obj"))
    {
        fso.DeleteFolder(path + "\\obj");
    }
    if(fso.FolderExists(path + "\\Bin"))
    {
        fso.DeleteFolder(path + "\\Bin");
    }
    
    wscript_shell.CurrentDirectory = path;
    exec_verbose('msbuild CordovaAppProj.csproj');
    //From original bat : msbuild /clp:NoSummary;NoItemAndPropertyList;Verbosity=minimal /nologo /p:Configuration=Debug

    //Get package name
    //TODO: find a better way to do this (title in WPAppManifest? not always the name of the xap)
    /*var app = read(path + '\\App.xaml');
    var temp = app.match(/x\:Class\=\"(.*)\"/)[0].split('.', 1);
    var app_name = temp.toString().split('"')[1];

    //Check if file xap was created
    if(!fso.FileExists(path + '\\Bin\\Debug\\' + app_name + '.xap'))
    {
        WScript.StdErr.WriteLine('ERROR: MSBuild failed to create .xap when building cordova-wp8.');
        WScript.Quit(1);
    }
    WScript.StdOut.WriteLine("SUCESS");

    WScript.StdOut.WriteLine("BUILD SUCCESS.");*/
}

// builds the CordovaDeploy.exe if it does not already exist 
function cordovaDeploy()
{
    if(fso.FileExists(ROOT + CORDOVA_DEPLOY_EXE))
    {
        return true;
    }

    WScript.StdOut.WriteLine("CordovaDeploy.exe not found, attempting to build CordovaDeploy.exe...");

    //Build CordovaDeploy.exe
    if(fso.FolderExists(ROOT + '\\tooling') && fso.FolderExists(ROOT + CORDOVA_DEPLOY) && 
        fso.FileExists(ROOT + CORDOVA_DEPLOY + '\\CordovaDeploy.sln'))
    {
        // delete any previously generated files
        if(fso.FolderExists(ROOT + CORDOVA_DEPLOY + "\\CordovaDeploy\\obj"))
        {
            fso.DeleteFolder(ROOT + CORDOVA_DEPLOY + "\\CordovaDeploy\\obj");
        }
        if(fso.FolderExists(ROOT + CORDOVA_DEPLOY + "\\CordovaDeploy\\Bin"))
        {
            fso.DeleteFolder(ROOT + CORDOVA_DEPLOY + "\\CordovaDeploy\\Bin");
        }
        exec_verbose('msbuild ' + ROOT + CORDOVA_DEPLOY + '\\CordovaDeploy.sln');

        if(fso.FileExists(ROOT + CORDOVA_DEPLOY_EXE))
        {
            WScript.StdOut.WriteLine("MSBUILD COMPLETE, SUCCESS.");
            return true;
        }
        else
        {
            WScript.StdOut.WriteLine("MSBUILD FAILED TO COMPILE CordovaDeploy.exe");
            return false;
        }
    }
    else
    {
        return false;
    }
}

//TODO: Output errors from CordovaDeploy so user can troubleshoot problems

// builds and launches project on device
function debug(path)
{
    if(cordovaDeploy() && fso.FileExists(ROOT + CORDOVA_DEPLOY_EXE))
    {
        build_xap(path);
        WScript.StdOut.WriteLine('Deploying to device ...');
        exec_verbose('%comspec% /c ' + ROOT + CORDOVA_DEPLOY_EXE + ' ' + path + ' -d:0');
    }
    else
    {
        WScript.StdOut.WriteLine("Error: Failed to find/build CordovaDeploy.exe");
        WScript.StdOut.WriteLine("DEPLOY FAILED.");
        WScript.Quit(1);
    }
}

// builds and launches project on emulator
function emulate(path)
{
    if(cordovaDeploy() && fso.FileExists(ROOT + CORDOVA_DEPLOY_EXE))
    {
        build_xap(path);
        WScript.StdOut.WriteLine('Deploying to emulator ...');
        exec_verbose('%comspec% /c ' + ROOT + CORDOVA_DEPLOY_EXE + ' ' + path + ' -d:1');
    }
    else
    {
        WScript.StdOut.WriteLine("Error: Failed to find/build CordovaDeploy.exe");
        WScript.StdOut.WriteLine("DEPLOY FAILED.");
        WScript.Quit(1);
    }
}


var project_path;
WScript.StdOut.WriteLine("");

if(args.Count() > 0)
{
    // support help flags
    if(args(0) == "--help" || args(0) == "/?" ||
            args(0) == "help" || args(0) == "-help" || args(0) == "/help")
    {
        Usage();
        WScript.Quit(1);
    }
    else if(args.Count() > 2)
    {
        WScript.StdOut.WriteLine("Error: Too many arguments.");
        Usage();
        WScript.Quit(1);
    }
    else if(fso.FolderExists(args(0)))
    {
        if(args.Count() > 1)
        {
            if(args(1) == "-emulate" || args(1) == "-e")
            {
                emulate(args(0));
            }
            else if(args(1) == "-debug" || args(1) == "-d")
            {
                debug(args(0));
            }
            else
            {
                WScript.StdOut.WriteLine("Error: \"" + arg(1) + "\" is not recognized as a deploy option");
                Usage();
                WScript.Quit(1);
            }
        }
        else
        {
            WScript.StdOut.WriteLine("WARNING: Debug/Emulate not specified, defaulting to emulate...");
            emulate(args(0));
        }
    }
    else
    {
        WScript.StdOut.WriteLine("Error: Project directory not found,");
        WScript.StdOut.WriteLine("please ensure you give the path to your project.");
        Usage();
        WScript.Quit(1);
    }
}
else
{
    Usage();
    WScript.Quit(1);
}