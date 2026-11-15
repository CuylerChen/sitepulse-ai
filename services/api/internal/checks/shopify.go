package checks

import (
	"net/url"
	"strings"

	"sitepulse.ai/api/internal/crawler"
	"sitepulse.ai/api/internal/models"
)

func Shopify(page *crawler.Page, final *url.URL) []models.Check {
	if page == nil || !page.Shopify {
		return nil
	}
	product := final != nil && strings.Contains(final.Path, "/products/")
	var out []models.Check
	out = append(out, models.Check{
		Category: "shopify", CheckKey: "shopify.detected", Status: models.StatusPass, Severity: models.SeverityInfo,
		Title: "Shopify storefront detected", Description: "The HTML includes Shopify assets or a Shopify generator tag. No app install is required for this audit.",
		Evidence: map[string]any{"product_url": product}, Recommendation: "Run the audit on a product URL to check product schema, copy, and image alt text.",
	})
	if !product {
		return out
	}
	hasProduct := crawler.HasSchema(page.SchemaTypes, "Product")
	status := models.StatusFail
	severity := models.SeverityHigh
	title := "Product structured data is missing"
	desc := "This product URL does not include Product JSON-LD."
	if hasProduct {
		status, severity = models.StatusPass, models.SeverityInfo
		title = "Product structured data is present"
		desc = "Product JSON-LD was found. Confirm price, availability, and images in that block before publishing."
	}
	out = append(out, models.Check{
		Category: "shopify", CheckKey: "shopify.product_schema", Status: status, Severity: severity,
		Title: title, Description: desc, Evidence: map[string]any{"types": page.SchemaTypes},
		Recommendation: "Add Product JSON-LD with name, image, description, and offers.",
	})
	titleStatus := models.StatusWarning
	if len(page.Title) >= 20 && len(page.Title) <= 70 {
		titleStatus = models.StatusPass
	}
	out = append(out, models.Check{
		Category: "shopify", CheckKey: "shopify.product_title", Status: titleStatus, Severity: models.SeverityMedium,
		Title: "Product title length", Description: "Product titles work best when they name the item and a distinguishing detail.",
		Evidence: map[string]any{"length": len(page.Title)}, Recommendation: "Include the product name and one useful attribute, then keep it readable.",
	})
	return out
}
