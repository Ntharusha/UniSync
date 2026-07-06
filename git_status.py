import subprocess

res = subprocess.run(['git', 'status'], capture_output=True, text=True)
with open('git_status.txt', 'w') as f:
    f.write("STDOUT:\n")
    f.write(res.stdout)
    f.write("\nSTDERR:\n")
    f.write(res.stderr)
print("Git status written to git_status.txt")
