;; Data Usage Tracker Contract

(define-map data-usage
  { vault-id: uint, user: principal }
  { usage-count: uint }
)

(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u100))
(define-constant err-vault-not-found (err u101))

(define-public (record-data-usage (vault-id uint) (user principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (let
      ((current-usage (default-to { usage-count: u0 } (map-get? data-usage { vault-id: vault-id, user: user }))))
      (ok (map-set data-usage
        { vault-id: vault-id, user: user }
        { usage-count: (+ u1 (get usage-count current-usage)) }
      ))
    )
  )
)

(define-read-only (get-data-usage (vault-id uint) (user principal))
  (ok (get usage-count (default-to { usage-count: u0 } (map-get? data-usage { vault-id: vault-id, user: user }))))
)

(define-public (reset-data-usage (vault-id uint) (user principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (ok (map-set data-usage
      { vault-id: vault-id, user: user }
      { usage-count: u0 }
    ))
  )
)

