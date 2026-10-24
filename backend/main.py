from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

ans={
    "message": "Hello, World!"
}

class Item(BaseModel):
    test: str
@app.get("/api/profile")
def read_root():
    return ans

@app.post("/api/receive")
def create_item(req: Item):
    return {
        "text": req.tst
    }
