#!/usr/bin/env bash
# This script builds the React app and deploys both the docs site and the React app under '/app' on the gh-pages branch.
set -e

# Build React app
npm run build

# Ensure docs folder exists
if [ ! -d "docs" ]; then
  echo "Error: docs directory not found."
  exit 1
fi

# Clone gh-pages branch into a temp directory
tmp_dir=$(mktemp -d)
echo "Cloning gh-pages branch into $tmp_dir"
git clone --branch gh-pages "$(git config --get remote.origin.url)" "$tmp_dir"

# Clear old contents
echo "Clearing old files"
rm -rf "$tmp_dir"/*

# Copy React build to root of gh-pages
echo "Copying React build to GH-Pages root"
cp -R build/* "$tmp_dir/"

# Copy docs to GH-Pages /docs
echo "Copying docs to GH-Pages /docs"
mkdir -p "$tmp_dir/docs"
cp -R docs/* "$tmp_dir/docs/"

# Commit and push changes
echo "Committing and pushing to gh-pages branch"
cd "$tmp_dir"
git add .
git commit -m "chore(deploy): publish docs and React app"
git push origin gh-pages

echo "Deployment complete."
# Cleanup
echo "Cleaning up"
rm -rf "$tmp_dir"
