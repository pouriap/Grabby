#include <windows.h>
#include <stdio.h>
#include <string>

using namespace std;

int main(int argc, char *argv[])
{
    STARTUPINFO si;
    PROCESS_INFORMATION pi;

    ZeroMemory( &si, sizeof(si) );
    si.cb = sizeof(si);
    ZeroMemory( &pi, sizeof(pi) );

    string exeName;
    //this wasn't in the docs but arguments have to start with space otherwise it won't work
    string args = " ";
    int flags;

    //this is the case when firefox runs this from manifest to open the connection
    if( argc>1 && strcmp(argv[1], "--spawn") != 0 ){
        exeName = "node.exe";
        args.append("host.js");
        flags = 0;
    }
    //this is the case when we want to run a detached process from within host.js
    else if( argc==4 && strcmp(argv[1], "--spawn") == 0){
        exeName = argv[2];
        args.append(argv[3]);
        flags = CREATE_BREAKAWAY_FROM_JOB;
    }
    else{
        printf("bad arguments");
        return 1;
    }

    LPSTR lpApplicationName = const_cast<char *>(exeName.c_str());
    LPSTR lpCommandLine = const_cast<char *>(args.c_str());


    if(!CreateProcess(
        lpApplicationName,        // Application to run
        lpCommandLine,           // Arguments for the application
        NULL,           // Process handle not inheritable
        NULL,           // Thread handle not inheritable
        FALSE,          // Set handle inheritance to FALSE
        flags,              // No creation flags
        NULL,           // Use parent's environment block
        NULL,           // Use parent's starting directory
        &si,            // Pointer to STARTUPINFO structure
        &pi             // Pointer to PROCESS_INFORMATION structure
    )){
        printf( "CreateProcess failed (%d).\n", GetLastError() );
        return 1;
    }

    // Wait until child process exits.
    WaitForSingleObject( pi.hProcess, INFINITE );

    // Close process and thread handles.
    CloseHandle( pi.hProcess );
    CloseHandle( pi.hThread );
}
