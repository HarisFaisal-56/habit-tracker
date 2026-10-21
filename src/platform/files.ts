// File export and import. Web implementation: a download link and a file input.
// A Capacitor build can replace these with the Filesystem and Share plugins.

/** Offers `contents` to the user as a downloaded file. */
export function saveTextFile(fileName: string, contents: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke later: some browsers start the download asynchronously.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}

/** Lets the user choose a file and returns its text, or null if they cancel. */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve, reject);
    });
    input.addEventListener("cancel", () => {
      resolve(null);
    });
    input.click();
  });
}
