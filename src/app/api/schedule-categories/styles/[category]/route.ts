import { NextResponse } from "next/server";
import { setCategoryStyle } from "@/lib/file-db";
import { requireUser } from "@/lib/route-auth";
import { CATEGORIES, type Category } from "@/lib/types";
import { isValidColorHex } from "@/lib/utils";

export async function PATCH(
  request: Request,
  context: { params: { category: string } }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const category = context.params.category as Category;
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { colorHex?: string; color_hex?: string }
    | null;
  const colorHex = body?.colorHex ?? body?.color_hex ?? "";

  if (!isValidColorHex(colorHex)) {
    return NextResponse.json({ error: "invalid_color_hex" }, { status: 400 });
  }

  const updatedColor = await setCategoryStyle(auth.user.id, category, colorHex);
  return NextResponse.json({
    ok: true,
    category,
    colorHex: updatedColor
  });
}
