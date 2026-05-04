import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../store/appStore.js";
import { useAuthStore } from "../store/authStore.js";

const emptyDish = {
  name: "",
  category: "Main",
  price: "",
  halfPrice: "",
  aliases: "",
  dayparts: [],
  preparationCost: "",
  sortOrder: "100",
  popular: false,
  rushVisible: true,
  isAvailable: true,
  ownerPin: ""
};

const emptyCategory = {
  name: "",
  sortOrder: "100",
  rushPriority: "0",
  ownerPin: ""
};

const daypartOptions = ["morning", "lunch", "night"];

export function MenuPage() {
  const {
    menu,
    categories,
    loadBootstrap,
    createCategory,
    updateCategory,
    deleteCategory,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    importMenu,
    exportMenu
  } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef(null);

  const [dishForm, setDishForm] = useState(emptyDish);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingDishId, setEditingDishId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    loadBootstrap().catch(() => {});
  }, [loadBootstrap]);

  const visibleCategories = useMemo(() => {
    const names = new Set(categories.map((category) => category.name));
    for (const item of menu) {
      if (item.category) {
        names.add(item.category);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [categories, menu]);

  const filteredMenu = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const aliasText = Array.isArray(item.aliases) ? item.aliases.join(" ").toLowerCase() : "";
      return `${item.name} ${item.category} ${aliasText}`.toLowerCase().includes(normalizedQuery);
    });
  }, [categoryFilter, menu, query]);

  const resetDishForm = () => {
    setDishForm(emptyDish);
    setEditingDishId("");
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory);
    setEditingCategoryId("");
  };

  const submitDish = async () => {
    const name = dishForm.name.trim();
    const category = dishForm.category.trim() || "Main";
    const price = Number(dishForm.price);
    const halfPrice = Number(dishForm.halfPrice || 0);

    if (!name || price <= 0) {
      setStatus("Dish name and full price are required.");
      return;
    }

    setBusy("dish");
    setStatus(editingDishId ? "Updating dish..." : "Saving dish...");

    try {
      const payload = {
        name,
        category,
        price,
        aliases: dishForm.aliases
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean),
        dayparts: dishForm.dayparts,
        preparationCost: Number(dishForm.preparationCost || 0),
        sortOrder: Number(dishForm.sortOrder || 100),
        popular: dishForm.popular,
        rushVisible: dishForm.rushVisible,
        isAvailable: dishForm.isAvailable,
        portions: [
          { label: "Full", price, isDefault: true },
          ...(halfPrice > 0 ? [{ label: "Half", price: halfPrice }] : [])
        ],
        ownerPin: dishForm.ownerPin || undefined
      };

      if (editingDishId) {
        await updateMenuItem(editingDishId, payload);
        setStatus(`Dish "${name}" updated.`);
      } else {
        await addMenuItem(payload);
        setStatus(`Dish "${name}" created.`);
      }

      resetDishForm();
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "Dish could not be saved.");
    } finally {
      setBusy("");
    }
  };

  const submitCategory = async () => {
    const name = categoryForm.name.trim();
    if (!name) {
      setStatus("Category name is required.");
      return;
    }

    setBusy("category");
    setStatus(editingCategoryId ? "Updating category..." : "Saving category...");

    try {
      const payload = {
        name,
        sortOrder: Number(categoryForm.sortOrder || 100),
        rushPriority: Number(categoryForm.rushPriority || 0),
        ownerPin: categoryForm.ownerPin || undefined
      };

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, payload);
        setStatus(`Category "${name}" updated.`);
      } else {
        await createCategory(payload);
        setStatus(`Category "${name}" created.`);
      }

      resetCategoryForm();
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "Category could not be saved.");
    } finally {
      setBusy("");
    }
  };

  const startEditDish = (item) => {
    const halfPortion = item.portions?.find((portion) => portion.label.toLowerCase() === "half");
    setEditingDishId(item._id);
    setDishForm({
      name: item.name,
      category: item.category || "Main",
      price: String(item.price || ""),
      halfPrice: halfPortion?.price ? String(halfPortion.price) : "",
      aliases: Array.isArray(item.aliases) ? item.aliases.join(", ") : "",
      dayparts: Array.isArray(item.dayparts) ? item.dayparts : [],
      preparationCost: String(item.preparationCost || 0),
      sortOrder: String(item.sortOrder || 100),
      popular: Boolean(item.popular),
      rushVisible: typeof item.rushVisible === "undefined" ? true : Boolean(item.rushVisible),
      isAvailable: typeof item.isAvailable === "undefined" ? true : Boolean(item.isAvailable),
      ownerPin: ""
    });
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setCategoryForm({
      name: category.name,
      sortOrder: String(category.sortOrder || 100),
      rushPriority: String(category.rushPriority || 0),
      ownerPin: ""
    });
  };

  const handleDeleteDish = async (item) => {
    const confirmed = window.confirm(`Archive "${item.name}" from menu?`);
    if (!confirmed) return;

    try {
      await deleteMenuItem(item._id, {
        ownerPin: user?.role === "owner" ? undefined : dishForm.ownerPin || undefined
      });
      setStatus(`Dish "${item.name}" archived.`);
      if (editingDishId === item._id) {
        resetDishForm();
      }
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "Dish could not be archived.");
    }
  };

  const handleDeleteCategory = async (category) => {
    const confirmed = window.confirm(`Delete category "${category.name}"?`);
    if (!confirmed) return;

    try {
      await deleteCategory(category._id, {
        ownerPin: user?.role === "owner" ? undefined : categoryForm.ownerPin || undefined
      });
      setStatus(`Category "${category.name}" deleted.`);
      if (editingCategoryId === category._id) {
        resetCategoryForm();
      }
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "Category could not be deleted.");
    }
  };

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setBusy("import");
      setStatus(`Importing ${file.name}...`);
      const csv = await file.text();
      const result = await importMenu(csv, user?.role === "owner" ? undefined : dishForm.ownerPin || undefined);
      setStatus(`Import complete: ${result.createdCount} created, ${result.updatedCount} updated.`);
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "CSV import failed.");
    } finally {
      event.target.value = "";
      setBusy("");
    }
  };

  const handleExport = async () => {
    try {
      setBusy("export");
      setStatus("Preparing export...");
      const blob = await exportMenu();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tracky-menu-export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Menu export downloaded.");
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "Export failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Catalog Control</p>
            <h1 className="mt-1 font-display text-3xl text-brand-100">Menu Ops Workspace</h1>
            <p className="mt-2 max-w-3xl text-sm text-brand-200/80">
              Owner-safe catalog management for dishes, categories, and bulk updates without touching the live billing flow.
            </p>
          </div>
          <div className="grid min-w-[240px] gap-2 sm:grid-cols-2">
            <button className="pill-button" onClick={() => fileInputRef.current?.click()} disabled={busy === "import"}>
              {busy === "import" ? "Importing..." : "Import CSV"}
            </button>
            <button className="pill-button" onClick={handleExport} disabled={busy === "export"}>
              {busy === "export" ? "Exporting..." : "Export CSV"}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-brand-700 bg-brand-800/70 p-4">
            <p className="text-xs text-brand-200/70">Total Dishes</p>
            <p className="mt-2 text-2xl font-semibold text-brand-100">{menu.length}</p>
          </div>
          <div className="rounded-2xl border border-brand-700 bg-brand-800/70 p-4">
            <p className="text-xs text-brand-200/70">Categories</p>
            <p className="mt-2 text-2xl font-semibold text-brand-100">{visibleCategories.length}</p>
          </div>
          <div className="rounded-2xl border border-brand-700 bg-brand-800/70 p-4">
            <p className="text-xs text-brand-200/70">Rush Ready</p>
            <p className="mt-2 text-2xl font-semibold text-brand-100">{menu.filter((item) => item.rushVisible).length}</p>
          </div>
          <div className="rounded-2xl border border-brand-700 bg-brand-800/70 p-4">
            <p className="text-xs text-brand-200/70">Popular Tagged</p>
            <p className="mt-2 text-2xl font-semibold text-brand-100">{menu.filter((item) => item.popular).length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <p className="section-title">{editingDishId ? "Edit Dish" : "Add Dish"}</p>
            {editingDishId ? (
              <button className="text-sm text-brand-200/75" onClick={resetDishForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Dish name" value={dishForm.name} onChange={(event) => setDishForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Category" value={dishForm.category} onChange={(event) => setDishForm((current) => ({ ...current, category: event.target.value }))} list="tracky-category-list" />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Full price" type="number" min="1" value={dishForm.price} onChange={(event) => setDishForm((current) => ({ ...current, price: event.target.value }))} />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Half price (optional)" type="number" min="0" value={dishForm.halfPrice} onChange={(event) => setDishForm((current) => ({ ...current, halfPrice: event.target.value }))} />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none md:col-span-2" placeholder="Aliases separated by comma" value={dishForm.aliases} onChange={(event) => setDishForm((current) => ({ ...current, aliases: event.target.value }))} />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Preparation cost" type="number" min="0" value={dishForm.preparationCost} onChange={(event) => setDishForm((current) => ({ ...current, preparationCost: event.target.value }))} />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Sort order" type="number" min="0" value={dishForm.sortOrder} onChange={(event) => setDishForm((current) => ({ ...current, sortOrder: event.target.value }))} />
            <div className="md:col-span-2">
              <p className="mb-2 text-sm text-brand-200/75">Visible dayparts</p>
              <div className="flex flex-wrap gap-2">
                {daypartOptions.map((daypart) => (
                  <button
                    key={daypart}
                    className={`rounded-2xl border px-3 py-2 text-sm ${
                      dishForm.dayparts.includes(daypart)
                        ? "border-brand-400 bg-brand-500/20 text-brand-50"
                        : "border-brand-700 bg-brand-800 text-brand-200"
                    }`}
                    onClick={() =>
                      setDishForm((current) => ({
                        ...current,
                        dayparts: current.dayparts.includes(daypart)
                          ? current.dayparts.filter((entry) => entry !== daypart)
                          : [...current.dayparts, daypart]
                      }))
                    }
                    type="button"
                  >
                    {daypart}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-100">
              <input type="checkbox" checked={dishForm.popular} onChange={(event) => setDishForm((current) => ({ ...current, popular: event.target.checked }))} />
              Show as top seller
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-100">
              <input type="checkbox" checked={dishForm.rushVisible} onChange={(event) => setDishForm((current) => ({ ...current, rushVisible: event.target.checked }))} />
              Visible in rush mode
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-100">
              <input type="checkbox" checked={dishForm.isAvailable} onChange={(event) => setDishForm((current) => ({ ...current, isAvailable: event.target.checked }))} />
              Available now
            </label>
            {user?.role !== "owner" ? (
              <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Owner PIN" type="password" value={dishForm.ownerPin} onChange={(event) => setDishForm((current) => ({ ...current, ownerPin: event.target.value }))} />
            ) : null}
          </div>
          <button className="pill-button mt-4" onClick={submitDish} disabled={busy === "dish"}>
            {busy === "dish" ? "Saving..." : editingDishId ? "Update Dish" : "Create Dish"}
          </button>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <p className="section-title">{editingCategoryId ? "Edit Category" : "Category Manager"}</p>
            {editingCategoryId ? (
              <button className="text-sm text-brand-200/75" onClick={resetCategoryForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Sort order" type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))} />
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Rush priority" type="number" value={categoryForm.rushPriority} onChange={(event) => setCategoryForm((current) => ({ ...current, rushPriority: event.target.value }))} />
            {user?.role !== "owner" ? (
              <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none" placeholder="Owner PIN" type="password" value={categoryForm.ownerPin} onChange={(event) => setCategoryForm((current) => ({ ...current, ownerPin: event.target.value }))} />
            ) : null}
            <button className="pill-button" onClick={submitCategory} disabled={busy === "category"}>
              {busy === "category" ? "Saving..." : editingCategoryId ? "Update Category" : "Create Category"}
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {categories.map((category) => (
              <div key={category._id} className="rounded-2xl border border-brand-700 bg-brand-800/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-brand-100">{category.name}</p>
                    <p className="text-xs text-brand-200/70">Sort {category.sortOrder} • Rush {category.rushPriority}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-xl border border-brand-600 px-3 py-2 text-xs text-brand-100" onClick={() => startEditCategory(category)}>
                      Edit
                    </button>
                    <button className="rounded-xl border border-red-400/50 px-3 py-2 text-xs text-red-100" onClick={() => handleDeleteCategory(category)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-title">Dish Library</p>
            <p className="mt-1 text-sm text-brand-200/75">Fast filterable list for edit, availability control, and cleanup.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none" placeholder="Search dish or alias" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm outline-none" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {visibleCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filteredMenu.map((item) => (
            <div key={item._id} className="rounded-2xl border border-brand-700 bg-brand-800/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-brand-100">{item.name}</h3>
                  <p className="mt-1 text-sm text-brand-200/75">
                    {item.category} • Rs {item.price}
                    {item.portions?.some((portion) => portion.label.toLowerCase() === "half")
                      ? ` • Half Rs ${item.portions.find((portion) => portion.label.toLowerCase() === "half")?.price}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-brand-200/60">
                    {(item.aliases || []).join(", ") || "No aliases"} • Cost Rs {item.preparationCost || 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.popular ? <span className="rounded-full bg-brand-500/20 px-2 py-1 text-xs text-brand-100">Top</span> : null}
                  {item.rushVisible ? <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-100">Rush</span> : null}
                  {!item.isAvailable ? <span className="rounded-full bg-orange-500/20 px-2 py-1 text-xs text-orange-100">Hidden</span> : null}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-xl border border-brand-600 px-3 py-2 text-xs text-brand-100" onClick={() => startEditDish(item)}>
                  Edit
                </button>
                <button className="rounded-xl border border-red-400/50 px-3 py-2 text-xs text-red-100" onClick={() => handleDeleteDish(item)}>
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <datalist id="tracky-category-list">
        {visibleCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {status ? <div className="glass-card p-4 text-sm text-brand-100">{status}</div> : null}
    </div>
  );
}
