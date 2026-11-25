"""Vercel serverless entry for the AccessForge API (project `accessforge-api`).

Vercel runs this ASGI app as a Python function; vercel.json routes every path here.
Settings come from the project's environment variables, validated by accessforge_api.config.
"""

from accessforge_api.main import create_app

app = create_app()
