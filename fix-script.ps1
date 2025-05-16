Select-String -Path src/components/lecturer/ClassManagementCard.tsx -Pattern \ height=\\\24\\\\ -Context 0,30 | ForEach-Object { .Line }
