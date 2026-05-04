const numberWords = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5
};

export const parseOrderFallback = (transcript, menuItems) => {
  const input = transcript.toLowerCase();
  const matchedItems = [];

  menuItems.forEach((item) => {
    const normalizedName = item.name.toLowerCase();
    if (!input.includes(normalizedName)) return;

    const parts = input.split(normalizedName);
    let quantity = 1;

    for (const part of parts) {
      const tokens = part.trim().split(/\s+/).slice(-2);
      for (const token of tokens) {
        const parsed = Number(token);
        if (!Number.isNaN(parsed) && parsed > 0) quantity = parsed;
        if (numberWords[token]) quantity = numberWords[token];
      }
    }

    matchedItems.push({
      menuItemId: item._id,
      name: item.name,
      quantity
    });
  });

  return {
    items: matchedItems,
    notes: matchedItems.length ? "Parsed using fallback parser" : "No matching item found"
  };
};
